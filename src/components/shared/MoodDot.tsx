/** A single, consistently-sized colored dot standing in for a mood emoji. */
export function MoodDot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{ display: "inline-block", width: size, height: size, borderRadius: "50%", background: color, flexShrink: 0 }}
    />
  );
}
