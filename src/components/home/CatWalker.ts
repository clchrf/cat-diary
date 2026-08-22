import { IDLE_POOL, CLICK_REACTION_POOL } from "@/lib/catSprite";
import { randomWalkablePoint, pushOutsideBlocked, pointBlocked, type Rect } from "@/lib/roam";
import { saveCatPosition } from "@/lib/db";

const DOUBLE_TAP_MS = 320;
const INTERACTION_PAUSE_MS = 4000;
// A leisurely, constant walking speed — duration is derived from actual
// distance so a long walk doesn't get rushed to fit a fixed time window,
// clamped to stay within a calm, deliberate pace either way.
const WALK_SPEED_PX_PER_SEC = 32;
const MIN_WALK_MS = 3000;
const MAX_WALK_MS = 6000;

function pickRandom<T>(pool: readonly T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

interface DragTarget {
  startX: number;
  startY: number;
  moved: boolean;
}

/**
 * All the imperative state (timers, rAF tweening, direct DOM transform
 * writes, pointer bookkeeping) for the free-roaming home-page cat lives
 * here as a plain class, instantiated once per component instance via a
 * ref. Keeping it out of the component's render-scope function body is
 * deliberate: this is a stateful animation controller with
 * Math.random/Date.now calls and mutually-recursive scheduling methods,
 * which the React Compiler's static analysis (correctly) does not want to
 * see inside a component it's trying to auto-memoize.
 */
export class CatWalker {
  private containerEl: HTMLElement | null = null;
  private catEl: HTMLElement | null = null;
  private catSize: number;
  private pos = { x: 0, y: 0 };
  private blocked: Rect[] = [];
  private defaultPosition: { x: number; y: number } | undefined;
  private pausedUntil = 0;
  private unmounted = true;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private clickTimer: ReturnType<typeof setTimeout> | null = null;
  private rafId: number | null = null;
  private dragState: DragTarget | null = null;
  private lastTapTime = 0;

  onAnimationChange: (name: string) => void = () => {};
  onDraggingChange: (dragging: boolean) => void = () => {};
  onReactingChange: (reacting: boolean) => void = () => {};
  onReady: () => void = () => {};

  constructor(catSize: number) {
    this.catSize = catSize;
  }

  attach(containerEl: HTMLElement, catEl: HTMLElement) {
    this.containerEl = containerEl;
    this.catEl = catEl;
  }

  setBlockedRects(rects: Rect[]) {
    this.blocked = rects;
    if (this.unmounted || this.dragState) return;
    if (pointBlocked(this.pos.x, this.pos.y, this.catSize, rects)) {
      const fixed = pushOutsideBlocked(this.pos.x, this.pos.y, this.catSize, rects, this.containerSize());
      this.setTransform(fixed.x, fixed.y);
      this.persistPosition(fixed.x, fixed.y);
    }
  }

  setDefaultPosition(pos: { x: number; y: number } | undefined) {
    this.defaultPosition = pos;
  }

  async start(loadPosition: () => Promise<{ x: number; y: number } | undefined>) {
    this.unmounted = false;
    const saved = await loadPosition();
    if (this.unmounted) return;
    const rel = saved ?? this.defaultPosition ?? { x: 0.5, y: 0.15 };
    const size = this.containerSize();
    const maxX = Math.max(1, size.width - this.catSize);
    const maxY = Math.max(1, size.height - this.catSize);
    this.pos = { x: rel.x * maxX, y: rel.y * maxY };
    this.applyTransform();
    this.onReady();
    this.scheduleNextIdle();
  }

  destroy() {
    this.unmounted = true;
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.clickTimer) clearTimeout(this.clickTimer);
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }

  private containerSize() {
    const rect = this.containerEl?.getBoundingClientRect();
    return { width: rect?.width ?? this.catSize, height: rect?.height ?? this.catSize };
  }

  private applyTransform() {
    if (this.catEl) this.catEl.style.transform = `translate(${this.pos.x}px, ${this.pos.y}px)`;
  }

  private setTransform(x: number, y: number) {
    this.pos = { x, y };
    this.applyTransform();
  }

  private persistPosition(px: number, py: number) {
    const { width, height } = this.containerSize();
    const maxX = Math.max(1, width - this.catSize);
    const maxY = Math.max(1, height - this.catSize);
    saveCatPosition(px / maxX, py / maxY);
  }

  private scheduleNextIdle = () => {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    const delay = 4000 + Math.random() * 6000; // 4-10s, calm pacing
    this.idleTimer = setTimeout(() => {
      if (this.unmounted) return;
      const remaining = this.pausedUntil - Date.now();
      if (remaining > 0) {
        this.idleTimer = setTimeout(this.scheduleNextIdle, remaining);
        return;
      }
      this.startWalk();
    }, delay);
  };

  private startWalk = (forcedDestination?: { x: number; y: number }, onArrive?: () => void) => {
    const size = this.containerSize();
    const dest = forcedDestination ?? randomWalkablePoint(size, this.blocked, this.catSize);
    const from = { ...this.pos };
    const dx = dest.x - from.x;
    const dy = dest.y - from.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 12) {
      this.onAnimationChange(pickRandom(IDLE_POOL));
      if (onArrive) onArrive();
      else this.scheduleNextIdle();
      return;
    }

    const dir =
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? "walk_right"
          : "walk_left"
        : dy > 0
          ? "walk_down"
          : "walk_up";
    this.onAnimationChange(dir);

    const durationMs = Math.min(MAX_WALK_MS, Math.max(MIN_WALK_MS, (dist / WALK_SPEED_PX_PER_SEC) * 1000));
    const startTime = performance.now();

    const frame = (now: number) => {
      if (this.unmounted) return;
      const t = Math.min(1, (now - startTime) / durationMs);
      this.setTransform(from.x + dx * t, from.y + dy * t);
      if (t < 1) {
        this.rafId = requestAnimationFrame(frame);
      } else {
        this.persistPosition(dest.x, dest.y);
        this.onAnimationChange(pickRandom(IDLE_POOL));
        if (onArrive) onArrive();
        else this.scheduleNextIdle();
      }
    };
    this.rafId = requestAnimationFrame(frame);
  };

  private pause() {
    this.pausedUntil = Date.now() + INTERACTION_PAUSE_MS;
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }

  private triggerClickReaction() {
    this.pause();
    this.onReactingChange(true);
    this.onAnimationChange(pickRandom(CLICK_REACTION_POOL));
  }

  handleReactionComplete = () => {
    this.onReactingChange(false);
    this.onAnimationChange(pickRandom(IDLE_POOL));
    this.scheduleNextIdle();
  };

  handlePointerDown = (clientX: number, clientY: number) => {
    // Stop the scheduled auto-walk from firing mid-gesture (e.g. between a
    // tap and its double-tap detection window, or right as a drag starts).
    this.pause();
    this.dragState = { startX: clientX, startY: clientY, moved: false };
  };

  handlePointerMove = (clientX: number, clientY: number, dragThreshold: number) => {
    const drag = this.dragState;
    if (!drag) return;
    if (!drag.moved) {
      const dx = clientX - drag.startX;
      const dy = clientY - drag.startY;
      if (Math.hypot(dx, dy) < dragThreshold) return;
      drag.moved = true;
      this.pause();
      this.onDraggingChange(true);
    }
    const rect = this.containerEl?.getBoundingClientRect();
    if (!rect) return;
    const size = this.containerSize();
    const px = Math.max(0, Math.min(size.width - this.catSize, clientX - rect.left - this.catSize / 2));
    const py = Math.max(0, Math.min(size.height - this.catSize, clientY - rect.top - this.catSize / 2));
    this.setTransform(px, py);
  };

  handlePointerUp = () => {
    const drag = this.dragState;
    this.dragState = null;
    if (!drag) return;

    if (drag.moved) {
      const settled = pushOutsideBlocked(this.pos.x, this.pos.y, this.catSize, this.blocked, this.containerSize());
      this.setTransform(settled.x, settled.y);
      this.persistPosition(settled.x, settled.y);
      this.onDraggingChange(false);
      this.pausedUntil = Date.now() + INTERACTION_PAUSE_MS;
      this.scheduleNextIdle();
      return;
    }

    // a tap (not a drag) — resolve single vs double click
    const now = Date.now();
    if (this.lastTapTime && now - this.lastTapTime < DOUBLE_TAP_MS) {
      this.lastTapTime = 0;
      if (this.clickTimer) {
        clearTimeout(this.clickTimer);
        this.clickTimer = null;
      }
      this.pause();
      const rect = this.containerEl?.getBoundingClientRect();
      if (rect) {
        const raw = { x: drag.startX - rect.left - this.catSize / 2, y: drag.startY - rect.top - this.catSize / 2 };
        const dest = pushOutsideBlocked(raw.x, raw.y, this.catSize, this.blocked, this.containerSize());
        this.startWalk(dest, () => this.scheduleNextIdle());
      }
      return;
    }
    this.lastTapTime = now;
    this.clickTimer = setTimeout(() => {
      this.lastTapTime = 0;
      this.triggerClickReaction();
    }, DOUBLE_TAP_MS);
  };
}
