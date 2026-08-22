export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function rectsOverlap(a: Rect, b: Rect, margin = 0): boolean {
  return !(
    a.left + a.width + margin < b.left ||
    b.left + b.width + margin < a.left ||
    a.top + a.height + margin < b.top ||
    b.top + b.height + margin < a.top
  );
}

export function pointBlocked(x: number, y: number, size: number, blocked: Rect[], margin = 6): boolean {
  const catRect: Rect = { left: x, top: y, width: size, height: size };
  return blocked.some((b) => rectsOverlap(catRect, b, margin));
}

/** Rejection-samples a free point; falls back to whatever the last attempt was if none is found. */
export function randomWalkablePoint(
  container: { width: number; height: number },
  blocked: Rect[],
  size: number,
  attempts = 24
): { x: number; y: number } {
  let last = { x: 0, y: 0 };
  for (let i = 0; i < attempts; i++) {
    const x = Math.random() * Math.max(1, container.width - size);
    const y = Math.random() * Math.max(1, container.height - size);
    last = { x, y };
    if (!pointBlocked(x, y, size, blocked)) return last;
  }
  return last;
}

/** Nudges a point out of any blocked rect it overlaps, then clamps to the container bounds. */
export function pushOutsideBlocked(
  x: number,
  y: number,
  size: number,
  blocked: Rect[],
  container: { width: number; height: number },
  margin = 6
): { x: number; y: number } {
  const point = { x, y };
  for (const b of blocked) {
    if (!pointBlocked(point.x, point.y, size, [b], margin)) continue;
    const overlapLeft = point.x + size + margin - b.left;
    const overlapRight = b.left + b.width + margin - point.x;
    const overlapTop = point.y + size + margin - b.top;
    const overlapBottom = b.top + b.height + margin - point.y;
    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
    if (minOverlap === overlapLeft) point.x -= overlapLeft;
    else if (minOverlap === overlapRight) point.x += overlapRight;
    else if (minOverlap === overlapTop) point.y -= overlapTop;
    else point.y += overlapBottom;
  }
  point.x = Math.max(0, Math.min(Math.max(0, container.width - size), point.x));
  point.y = Math.max(0, Math.min(Math.max(0, container.height - size), point.y));
  return point;
}
