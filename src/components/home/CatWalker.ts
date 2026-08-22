import { IDLE_POOL, CLICK_REACTION_POOL } from "@/lib/catSprite";
import { randomPointInContainer, clampToContainer } from "@/lib/roam";
import { saveCatPosition } from "@/lib/db";

const DOUBLE_TAP_MS = 400;
const DOUBLE_TAP_DIST = 40; // px — second tap must land near the first to count as a double-tap
const DRAG_THRESHOLD = 8;
const INTERACTION_PAUSE_MS = 4000;
// A leisurely, constant walking speed for autonomous wandering — duration
// is derived from actual distance so a long walk doesn't get rushed to
// fit a fixed time window, clamped to stay calm either way.
const WALK_SPEED_PX_PER_SEC = 22;
const MIN_WALK_MS = 3500;
const MAX_WALK_MS = 7000;
// A summoned walk (double-tap) reacts instantly but still travels at the
// same unhurried pace — "fast reaction" and "slow movement" are different
// things.
const SUMMON_SPEED_PX_PER_SEC = 26;
const SUMMON_MIN_MS = 800;
const SUMMON_MAX_MS = 4000;
// Stop just short of the exact tapped point rather than centering on it.
const SUMMON_STOP_SHORT_MIN = 10;
const SUMMON_STOP_SHORT_MAX = 30;

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
 *
 * The cat can now walk anywhere on the page, including visually over
 * buttons/text — there is no exclusion-zone geometry here anymore. To
 * guarantee taps still reach real UI reliably even when the cat happens
 * to be sitting on top of it, the cat is deliberately kept BELOW the UI
 * content in stacking order (see HomeRoom.tsx) rather than given a
 * higher z-index: it can walk into a button's area, it just renders
 * slightly behind the button there instead of fully covering it, so a
 * tap on that button always reaches the button.
 */
export class CatWalker {
  private containerEl: HTMLElement | null = null;
  private catEl: HTMLElement | null = null;
  private catSize: number;
  private pos = { x: 0, y: 0 };
  private defaultPosition: { x: number; y: number } | undefined;
  private pausedUntil = 0;
  private unmounted = true;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private clickTimer: ReturnType<typeof setTimeout> | null = null;
  private rafId: number | null = null;
  private dragState: DragTarget | null = null;
  private lastTapTime = 0;
  private lastTapPos = { x: 0, y: 0 };

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
    const delay = 5000 + Math.random() * 7000; // 5-12s, calm pacing
    this.idleTimer = setTimeout(() => {
      if (this.unmounted) return;
      const remaining = this.pausedUntil - Date.now();
      if (remaining > 0) {
        this.idleTimer = setTimeout(this.scheduleNextIdle, remaining);
        return;
      }
      this.wanderWalk();
    }, delay);
  };

  private runWalk(
    dest: { x: number; y: number },
    speedPxPerSec: number,
    minMs: number,
    maxMs: number,
    onArrive: () => void
  ) {
    const from = { ...this.pos };
    const dx = dest.x - from.x;
    const dy = dest.y - from.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 8) {
      onArrive();
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

    const durationMs = Math.min(maxMs, Math.max(minMs, (dist / speedPxPerSec) * 1000));
    const startTime = performance.now();

    const frame = (now: number) => {
      if (this.unmounted) return;
      const t = Math.min(1, (now - startTime) / durationMs);
      this.setTransform(from.x + dx * t, from.y + dy * t);
      if (t < 1) {
        this.rafId = requestAnimationFrame(frame);
      } else {
        this.persistPosition(dest.x, dest.y);
        onArrive();
      }
    };
    this.rafId = requestAnimationFrame(frame);
  }

  /** Autonomous random wandering — anywhere in the container, no exclusions. */
  private wanderWalk = () => {
    const dest = randomPointInContainer(this.containerSize(), this.catSize);
    this.runWalk(dest, WALK_SPEED_PX_PER_SEC, MIN_WALK_MS, MAX_WALK_MS, () => {
      this.onAnimationChange(pickRandom(IDLE_POOL));
      this.scheduleNextIdle();
    });
  };

  /** Summoned by a double-tap — reacts immediately, still walks at an unhurried pace. */
  private commandWalkTo(clientX: number, clientY: number) {
    const rect = this.containerEl?.getBoundingClientRect();
    if (!rect) return;
    this.pause();
    const rawX = clientX - rect.left - this.catSize / 2;
    const rawY = clientY - rect.top - this.catSize / 2;
    const dx = rawX - this.pos.x;
    const dy = rawY - this.pos.y;
    const dist = Math.hypot(dx, dy);
    const stopShort = SUMMON_STOP_SHORT_MIN + Math.random() * (SUMMON_STOP_SHORT_MAX - SUMMON_STOP_SHORT_MIN);
    let target = { x: rawX, y: rawY };
    if (dist > stopShort) {
      const ratio = (dist - stopShort) / dist;
      target = { x: this.pos.x + dx * ratio, y: this.pos.y + dy * ratio };
    }
    const dest = clampToContainer(target.x, target.y, this.catSize, this.containerSize());
    this.runWalk(dest, SUMMON_SPEED_PX_PER_SEC, SUMMON_MIN_MS, SUMMON_MAX_MS, () => {
      this.onAnimationChange(pickRandom(IDLE_POOL));
      this.scheduleNextIdle();
    });
  }

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

  private isCatTarget(target: EventTarget | null): boolean {
    return !!this.catEl && target instanceof Node && this.catEl.contains(target);
  }

  /** Call on pointerdown anywhere within the home page's interactive area. */
  handleMainPointerDown = (target: EventTarget | null, clientX: number, clientY: number) => {
    // Any press anywhere interrupts autonomous wandering immediately —
    // the user is about to interact, one way or another.
    this.pause();
    if (this.isCatTarget(target)) {
      this.dragState = { startX: clientX, startY: clientY, moved: false };
    } else {
      this.dragState = null;
    }
  };

  /** Call on pointermove anywhere within the home page's interactive area. */
  handleMainPointerMove = (clientX: number, clientY: number) => {
    const drag = this.dragState;
    if (!drag) return;
    if (!drag.moved) {
      const dx = clientX - drag.startX;
      const dy = clientY - drag.startY;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      drag.moved = true;
      this.onDraggingChange(true);
    }
    const rect = this.containerEl?.getBoundingClientRect();
    if (!rect) return;
    const clamped = clampToContainer(
      clientX - rect.left - this.catSize / 2,
      clientY - rect.top - this.catSize / 2,
      this.catSize,
      this.containerSize()
    );
    this.setTransform(clamped.x, clamped.y);
  };

  /** Call on pointerup anywhere within the home page's interactive area. */
  handleMainPointerUp = (clientX: number, clientY: number) => {
    const drag = this.dragState;
    this.dragState = null;

    if (drag?.moved) {
      this.persistPosition(this.pos.x, this.pos.y);
      this.onDraggingChange(false);
      this.pausedUntil = Date.now() + INTERACTION_PAUSE_MS;
      this.scheduleNextIdle();
      return;
    }

    // A tap (not a drag), anywhere on the page — resolve single vs double.
    const wasOnCat = !!drag;
    const now = Date.now();
    const isDouble =
      this.lastTapTime &&
      now - this.lastTapTime < DOUBLE_TAP_MS &&
      Math.hypot(clientX - this.lastTapPos.x, clientY - this.lastTapPos.y) < DOUBLE_TAP_DIST;

    if (isDouble) {
      this.lastTapTime = 0;
      if (this.clickTimer) {
        clearTimeout(this.clickTimer);
        this.clickTimer = null;
      }
      this.commandWalkTo(clientX, clientY);
      return;
    }

    this.lastTapTime = now;
    this.lastTapPos = { x: clientX, y: clientY };
    this.clickTimer = setTimeout(() => {
      this.lastTapTime = 0;
      if (wasOnCat) this.triggerClickReaction();
      else this.scheduleNextIdle();
    }, DOUBLE_TAP_MS);
  };
}
