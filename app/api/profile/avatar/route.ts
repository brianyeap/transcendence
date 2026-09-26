import sharp from "sharp";
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

type DetectedFormat = "jpeg" | "png" | null;

function startsWith(bytes: Uint8Array, magic: number[]): boolean {
  if (bytes.length < magic.length) return false;
  for (let i = 0; i < magic.length; i += 1) {
    if (bytes[i] !== magic[i]) return false;
  }
  return true;
}

/**
 * Sniff the container from the first bytes of the file.
 *
 * This deliberately ignores `Content-Type` and the filename extension: both
 * are attacker-controlled. Anything that is not a JPEG or PNG — including
 * SVG, GIF, WebP, HTML and every polyglot — returns null and is rejected.
 */
function detectFormat(bytes: Uint8Array): DetectedFormat {
  if (startsWith(bytes, JPEG_MAGIC)) return "jpeg";
  if (startsWith(bytes, PNG_MAGIC)) return "png";
  return null;
}

export async function POST(request: Request) {
  // ---- 1. authenticate from the session, never from the body -------------
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  // ---- 2. size ceiling, checked before we parse anything -----------------
  const declaredLength = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_UPLOAD_BYTES) {
    return Response.json(
      { error: "Image is too large. Maximum size is 5 MB." },
      { status: 413 }
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return Response.json(
      { error: "Expected multipart/form-data." },
      { status: 400 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Could not read the upload." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json(
      { error: "No file provided. Send one file part named 'file'." },
      { status: 400 }
    );
  }

  if (file.size === 0) {
    return Response.json({ error: "The file is empty." }, { status: 400 });
  }

  // A chunked request can omit content-length, so re-check the real size.
  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json(
      { error: "Image is too large. Maximum size is 5 MB." },
      { status: 413 }
    );
  }

  const inputBytes = new Uint8Array(await file.arrayBuffer());

  // ---- 3. verify the real format, not the declared one -------------------
  const format = detectFormat(inputBytes);
  if (!format) {
    return Response.json(
      { error: "Unsupported image format. Please upload a JPEG or PNG." },
      { status: 415 }
    );
  }

  // ---- 4. decode and re-encode to a fixed 256x256 JPEG -------------------
  // `sharp` decodes the whole image; if the bytes are not a real, complete
  // image this throws and we reject. The re-encode means the stored object is
  // always something we produced, never the bytes the client sent.
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
    return Response.json(
      { error: "That file could not be read as an image." },
      { status: 415 }
    );
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
    return Response.json(
      { error: "Could not store the image. Please try again." },
      { status: 500 }
    );
  }

  // ---- 6. derive avatar_url ourselves and persist it --------------------
  // The URL comes from our own Storage response, not from the request.
  const { data: publicUrlData } = admin.storage
    .from(AVATARS_BUCKET)
    .getPublicUrl(objectPath);

  const publicUrl = publicUrlData?.publicUrl;
  if (!publicUrl) {
    return Response.json(
      { error: "Could not resolve the image URL." },
      { status: 500 }
    );
  }

  const avatarUrl = `${publicUrl}?v=${Date.now()}`;

  // Written with the user-scoped client so the existing "update own profile"
  // policy applies. We are only writing our own row.
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (profileError) {
    return Response.json(
      { error: "Could not save your profile photo." },
      { status: 500 }
    );
  }

  return Response.json({ avatarUrl });
}