import sharp from "sharp";
import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/profile/avatar
 *
 * The only place an avatar is validated, re-encoded and written.
 *
 * WHY THIS EXISTS
 * The upload used to happen straight from the browser: the client resized the
 * image with a canvas, checked `file.type`, and PUT the bytes into Supabase
 * Storage with the user's own session. Every one of those checks was advisory
 * — an attacker could skip the UI and POST arbitrary bytes to the Storage API
 * with a spoofed Content-Type (for example an SVG carrying an inline script,
 * served from our own trusted project origin).
 *
 * This route is the enforcement point. It:
 *   - authenticates from the session cookie, never from the request body
 *   - caps the request size before reading it
 *   - verifies the REAL format via magic bytes, ignoring the declared MIME type
 *   - fully decodes the image (this is what kills polyglots and mislabelled files)
 *   - re-encodes to a fixed 256x256 JPEG, so the stored bytes are always ours
 *   - writes with the service-role client, setting contentType server-side
 *   - derives avatar_url from the upload result and writes it itself
 *
 * The client never supplies a URL. `profiles.avatar_url` is only ever written
 * here.
 */

/** Hard ceiling for the incoming request body. */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

/** Output size. Matches the old client-side resize so avatars look the same. */
const AVATAR_SIZE = 256;
const AVATAR_QUALITY = 85;

const AVATARS_BUCKET = "avatars";

/** Magic bytes for the formats we accept. */
const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const GIF_MAGIC = [0x47, 0x49, 0x46, 0x38]; // "GIF8" (GIF87a and GIF89a)
const RIFF_MAGIC = [0x52, 0x49, 0x46, 0x46]; // "RIFF" at offset 0 ...
const WEBP_MAGIC = [0x57, 0x45, 0x42, 0x50]; // ... then "WEBP" at offset 8
const FTYP_MAGIC = [0x66, 0x74, 0x79, 0x70]; // "ftyp" at offset 4 (AVIF)

type DetectedFormat = "jpeg" | "png" | "gif" | "webp" | "avif" | null;

/** True if `magic` appears in `bytes` starting at `offset`. */
function hasBytesAt(bytes: Uint8Array, offset: number, magic: number[]): boolean {
  if (bytes.length < offset + magic.length) return false;
  for (let i = 0; i < magic.length; i += 1) {
    if (bytes[offset + i] !== magic[i]) return false;
  }
  return true;
}

/** Read 4 bytes at `offset` as an ASCII string, e.g. a brand like "avif". */
function asciiAt(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + 4));
}

/**
 * AVIF files start with an "ftyp" box that lists "brands" (format names).
 *
 *   bytes 0-3   box size (big-endian)
 *   bytes 4-7   "ftyp"
 *   bytes 8-11  major brand      e.g. "avif", or a generic one like "mif1"
 *   bytes 12-15 minor version    (ignored)
 *   bytes 16+   compatible brands, 4 bytes each, until the box ends
 *
 * It is AVIF if "avif" (still image) or "avis" (image sequence) appears as
 * the major brand or in the compatible list.
 */
function isAvif(bytes: Uint8Array): boolean {
  if (!hasBytesAt(bytes, 4, FTYP_MAGIC)) return false;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // Never read past the box or the file, whichever ends first.
  const boxEnd = Math.min(view.getUint32(0), bytes.length);

  const brands = [asciiAt(bytes, 8)];
  for (let offset = 16; offset + 4 <= boxEnd; offset += 4) {
    brands.push(asciiAt(bytes, offset));
  }
  return brands.includes("avif") || brands.includes("avis");
}

/**
 * Sniff the container from the first bytes of the file.
 *
 * This deliberately ignores `Content-Type` and the filename extension: both
 * are attacker-controlled. Anything that is not a JPEG, PNG, GIF, WebP or
 * AVIF — including SVG, HEIC, HTML and every polyglot — returns null and is
 * rejected. Passing this check only means "looks like one of those"; the
 * full decode in step 4 is what proves it.
 */
function detectFormat(bytes: Uint8Array): DetectedFormat {
  if (hasBytesAt(bytes, 0, JPEG_MAGIC)) return "jpeg";
  if (hasBytesAt(bytes, 0, PNG_MAGIC)) return "png";
  if (hasBytesAt(bytes, 0, GIF_MAGIC)) return "gif";
  if (hasBytesAt(bytes, 0, RIFF_MAGIC) && hasBytesAt(bytes, 8, WEBP_MAGIC)) {
    return "webp";
  }
  if (isAvif(bytes)) return "avif";
  return null;
}

export async function POST(request: Request) {
  // Error messages in the player's language (read from their "locale" cookie).
  const t = await getTranslations("AvatarErrors");

  // ---- 1. authenticate from the session, never from the body -------------
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ code: "not_authenticated" }, { status: 401 });
  }

  // ---- 2. size ceiling, checked before we parse anything -----------------
  const declaredLength = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_UPLOAD_BYTES) {
    return Response.json({ code: "file_too_large" }, { status: 413 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return Response.json({ code: "expected_multipart" }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ code: "could_not_read_upload" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ code: "no_file" }, { status: 400 });
  }

  if (file.size === 0) {
    return Response.json({ code: "empty_file" }, { status: 400 });
  }

  // A chunked request can omit content-length, so re-check the real size.
  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json({ code: "file_too_large" }, { status: 413 });
  }

  const inputBytes = new Uint8Array(await file.arrayBuffer());

  // ---- 3. verify the real format, not the declared one -------------------
  const format = detectFormat(inputBytes);
  if (!format) {
    return Response.json({ code: "invalid_format" }, { status: 415 });
  }

  // ---- 4. decode and re-encode to a fixed 256x256 JPEG -------------------
  // `sharp` decodes the whole image; if the bytes are not a real, complete
  // image this throws and we reject. The re-encode means the stored object is
  // always something we produced, never the bytes the client sent — so a
  // WebP, GIF or AVIF upload is still stored and served as a plain JPEG.
  // For an animated GIF/WebP, sharp only reads the first frame, so the
  // avatar ends up as a still image.
  let outputBuffer: Buffer;
  try {
    outputBuffer = await sharp(inputBytes, { failOn: "error" })
      .rotate() // apply EXIF orientation before we crop
      .resize(AVATAR_SIZE, AVATAR_SIZE, {
        fit: "cover", // centre-crop, equivalent to the old Math.min() crop
        position: "centre",
      })
      .jpeg({ quality: AVATAR_QUALITY, mozjpeg: true })
      .toBuffer();
  } catch {
    return Response.json({ code: "unreadable_image" }, { status: 415 });
  }

  // ---- 5. write with the service-role client -----------------------------
  // Path is derived from the verified session user id, never from input.
  const objectPath = `${user.id}/avatar.jpg`;

  const admin = createSupabaseAdminClient();
  const { error: uploadError } = await admin.storage
    .from(AVATARS_BUCKET)
    .upload(objectPath, outputBuffer, {
      upsert: true,
      // Set here, server-side. The client's declared type is never used.
      contentType: "image/jpeg",
      cacheControl: "3600",
    });

  if (uploadError) {
    return Response.json({ code: "storage_failed" }, { status: 500 });
  }

  // ---- 6. derive avatar_url ourselves and persist it --------------------
  // The URL comes from our own Storage response, not from the request.
  const { data: publicUrlData } = admin.storage
    .from(AVATARS_BUCKET)
    .getPublicUrl(objectPath);

  const publicUrl = publicUrlData?.publicUrl;
  if (!publicUrl) {
    return Response.json({ code: "url_resolve_failed" }, { status: 500 });
  }

  const avatarUrl = `${publicUrl}?v=${Date.now()}`;

  // Written with the user-scoped client so the existing "update own profile"
  // policy applies. We are only writing our own row.
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (profileError) {
    return Response.json({ code: "profile_save_failed" }, { status: 500 });
  }

  return Response.json({ avatarUrl });
}

/**
 * DELETE /api/profile/avatar
 *
 * Removes the caller's custom avatar and returns them to the initials
 * fallback. Authenticated exactly like POST: from the session cookie, never
 * from the body. The object path is derived from the verified user id, so a
 * caller can only ever remove their own file.
 *
 * ORDER MATTERS. The stored file is removed first, then the DB column is
 * nulled:
 *   - if the Storage delete fails, nothing has changed and we report an error
 *   - if the DB write fails after the file is gone, the row still points at a
 *     missing URL, which <Avatar> renders as initials anyway (the image 404s),
 *     so the UI is never left showing a photo that no longer exists
 *
 * A missing Storage object is not an error: `remove` is idempotent, and a user
 * who has no file (or whose file was already cleaned up) should still be able
 * to clear the column.
 */
export async function DELETE() {
  // ---- 1. authenticate from the session, never from the body -------------
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ code: "not_authenticated" }, { status: 401 });
  }

  // ---- 2. remove the stored file -----------------------------------------
  // Path is derived from the verified session user id, never from input.
  const objectPath = `${user.id}/avatar.jpg`;

  const admin = createSupabaseAdminClient();
  const { error: removeError } = await admin.storage
    .from(AVATARS_BUCKET)
    .remove([objectPath]);

  if (removeError) {
    return Response.json({ code: "storage_delete_failed" }, { status: 500 });
  }

  // ---- 3. clear the column -----------------------------------------------
  // Written with the user-scoped client so the existing "update own profile"
  // policy applies. We are only writing our own row.
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);

  if (profileError) {
    return Response.json({ code: "profile_delete_failed" }, { status: 500 });
  }

  return Response.json({ avatarUrl: null });
}
