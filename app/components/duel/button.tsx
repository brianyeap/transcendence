//  One button used everywhere, so the styling lives in a single file.
//  primary = the main action, danger = delete, quiet = a plain bordered button.
type Variant = "primary" | "danger" | "quiet";

const styles: Record<Variant, string> = {
  primary: "bg-brand text-white hover:opacity-90",
  danger: "border border-loss bg-panel text-loss hover:bg-raised",
  quiet: "border border-line bg-panel text-muted hover:text-ink",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-50 ${styles[variant]} ${className}`}
    />
  );
}
