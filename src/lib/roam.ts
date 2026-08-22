export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Picks any random point within the container bounds — the cat can walk the whole page now, no exclusion zones. */
export function randomPointInContainer(
  container: { width: number; height: number },
  size: number
): { x: number; y: number } {
  return {
    x: Math.random() * Math.max(1, container.width - size),
    y: Math.random() * Math.max(1, container.height - size),
  };
}

export function clampToContainer(
  x: number,
  y: number,
  size: number,
  container: { width: number; height: number }
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(Math.max(0, container.width - size), x)),
    y: Math.max(0, Math.min(Math.max(0, container.height - size), y)),
  };
}
