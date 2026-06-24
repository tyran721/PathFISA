export function StatusPill({
  tone,
  children
}: {
  tone: "green" | "amber" | "blue" | "gray" | "purple";
  children: React.ReactNode;
}) {
  return <span className={`status-pill ${tone}`}>{children}</span>;
}

