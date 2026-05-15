export default function DotGridBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-70"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(17, 24, 39, 0.08) 1px, transparent 0)",
        backgroundSize: "28px 28px",
        maskImage: "radial-gradient(circle at 50% 18%, black 28%, transparent 76%)",
      }}
    />
  );
}
