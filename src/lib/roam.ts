export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
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
