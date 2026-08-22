import type React from "react";

export function SectionLabel({
  id,
  children,
}: {
  id?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <p id={id} className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[#3a434f]">
      {children}
    </p>
  );
}
