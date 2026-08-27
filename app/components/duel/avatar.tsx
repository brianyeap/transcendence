export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "?";
  const sizeClass = size === "lg" ? "size-11 text-base" : size === "sm" ? "size-8 text-xs" : "size-9 text-sm";

  return (
    // shrink means dont let the elem shrik when inisde flex container, fades top left to bottom right
    <div className={`${sizeClass} grid shrink-0 place-items-center rounded-[30%] bg-gradient-to-br from-[#4d86ff] to-[#7a5acf] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.18)]`}>
      {initials}
    </div>
  );
}
