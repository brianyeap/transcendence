//  A profile picture, or a coloured square with the first two letters of the
//  name when the user has not uploaded one.
export function Avatar({
  name,
  imageUrl,
  size = "md",
}: {
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = size === "lg" ? "size-11 text-base" : size === "sm" ? "size-8 text-xs" : "size-9 text-sm";

  //  shrink-0 stops the square being squashed inside a flex row.
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`${sizeClass} shrink-0 rounded-lg object-cover`}
      />
    );
  }

  const initials = name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "?";

  return (
    <div className={`${sizeClass} grid shrink-0 place-items-center rounded-lg bg-brand font-bold text-white`}>
      {initials}
    </div>
  );
}
