export function Avatar({ 
	name, 
	imageUrl, 
	size = "md" 
  }: { 
	name: string; 
	imageUrl?: string | null;
	size?: "sm" | "md" | "lg" 
  }) {
	const sizeClass = size === "lg" ? "size-11 text-base" : size === "sm" ? "size-8 text-xs" : "size-9 text-sm";
  
	// If a real uploaded image exists, show it
	if (imageUrl) {
	  return (
		<img
		  src={imageUrl}
		  alt={name}
		  className={`${sizeClass} shrink-0 rounded-[30%] object-cover shadow-[inset_0_1px_0_rgba(255,255,255,.18)]`}
		/>
	  );
	}
  
	// Otherwise fall back to initials (original behaviour, unchanged)
	const initials = name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "?";
  
	return (
	  <div className={`${sizeClass} grid shrink-0 place-items-center rounded-[30%] bg-gradient-to-br from-[#4d86ff] to-[#7a5acf] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.18)]`}>
		{initials}
	  </div>
	);
}