// tailwinf doesnt have built in btn styling
const styles = {
  primary: "bg-brand text-white hover:opacity-90",
  danger: "border border-loss bg-panel text-loss hover:bg-raised",
  quiet: "border border-line bg-panel text-muted hover:text-ink",
};

export function Button({
  variant = "primary",
  className = "",
  ...props // passing all other props to the button element, like onClick, disabled, etc.
}: React.ComponentProps<"button"> & { variant?: keyof typeof styles }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-50 ${styles[variant]} ${className}`}
    />
  );
}
