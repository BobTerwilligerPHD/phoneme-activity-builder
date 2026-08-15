export default function Panel({ padding = "p-4", className = "", ...props }) {
  return (
    <div
      className={`border border-[var(--foreground)] rounded-sm ${padding} ${className}`}
      {...props}
    />
  );
}
