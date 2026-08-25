import { IDLE_POOL, CLICK_REACTION_POOL } from "@/lib/catSprite";
import { clampToContainer } from "@/lib/roam";
import { saveCatPosition } from "@/lib/db";

const DOUBLE_TAP_MS = 400;
const DOUBLE_TAP_DIST = 40; // px — second tap must land near the first to count as a double-tap
const DRAG_THRESHOLD = 8;
const INTERACTION_PAUSE_MS = 4000;
// A leisurely, constant walking speed for autonomous wandering. Each wander
// picks a duration first (3-6s) and derives a reachable distance from it —
// NOT the other way around — so a long diagonal across the page can never
// force a speed spike; it just takes longer legs to get there over several
// wander cycles instead of one fast burst.
const WALK_SPEED_PX_PER_SEC = 16;
const WANDER_MIN_MS = 3000;
const WANDER_MAX_MS = 6000;
// A summoned walk (double-tap) reacts instantly but still travels at the
// same unhurried pace — "fast reaction" and "slow movement" are different
// things. The max duration is generous so speed (not a time cap) governs
// even a call from clear across the page.
const SUMMON_SPEED_PX_PER_SEC = 20;
const SUMMON_MIN_MS = 500;
const SUMMON_MAX_MS = 12000;
// Stop just short of the exact tapped point rather than centering on it.
const SUMMON_STOP_SHORT_MIN = 10;
const SUMMON_STOP_SHORT_MAX = 30;
// A brief pause on an idle pose before starting a walk in a new facing
// direction — this is what makes a direction change read as the cat
// noticing and turning, instead of an instant cut from one directional
// sprite to another. Deliberately not a speed change: the walk itself still
// runs at the same WALK_SPEED_PX_PER_SEC once it starts.
const TURN_SETTLE_MS = 220;

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
 * The cat can walk anywhere on the page, including visually on top of
 * buttons/text — there is no exclusion-zone geometry here. The cat's own
 * element sits ABOVE the UI in stacking order (see HomeRoom.tsx) but with
 * `pointer-events: none`, so a tap always hits whatever real UI is
 * underneath rather than the cat's div. Because of that, this class can't
 * rely on the DOM event target to know when a tap/drag landed "on the
 * cat" — instead it hit-tests the pointer coordinates against the cat's
 * current on-screen rect directly (see isCatHit).
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
  private turnTimer: ReturnType<typeof setTimeout> | null = null;
  private rafId: number | null = null;
  private dragState: DragTarget | null = null;
  private lastTapTime = 0;
  private lastTapPos = { x: 0, y: 0 };
  private sleeping = false;
  private lastDirection: string | null = null;

  onAnimationChange: (name: string) => void = () => {};
  onDraggingChange: (dragging: boolean) => void = () => {};
  onReactingChange: (reacting: boolean) => void = () => {};
  onWakingChange: (waking: boolean) => void = () => {};
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

  /**
   * Awake/asleep is driven purely by whether today's medication is marked
   * taken (see page.tsx) — never by "not recorded yet". Falling asleep
   * interrupts any walk in place; waking plays a yawn/stretch once (this
   * pack has no dedicated wake animation) before resuming normal idling.
   */
  setSleeping(sleeping: boolean) {
    if (this.sleeping === sleeping) return;
    this.sleeping = sleeping;
    if (sleeping) {
      if (this.idleTimer) clearTimeout(this.idleTimer);
      if (this.rafId !== null) cancelAnimationFrame(this.rafId);
      this.onReactingChange(false);
      this.onWakingChange(false);
      this.onAnimationChange("sleep");
    } else {
      this.onWakingChange(true);
      this.onAnimationChange("yawn");
    }
  }

  handleWakeComplete = () => {
    this.onWakingChange(false);
    if (this.sleeping) return; // flipped back to sleep mid-yawn
    this.onAnimationChange(pickRandom(IDLE_POOL));
    this.scheduleNextIdle();
  };

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
    if (this.turnTimer) clearTimeout(this.turnTimer);
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
    if (this.sleeping) return;
    if (this.idleTimer) clearTimeout(this.idleTimer);
    const delay = 5000 + Math.random() * 7000; // 5-12s, calm pacing
    this.idleTimer = setTimeout(() => {
      if (this.unmounted || this.sleeping) return;
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

    const startTween = () => {
      this.lastDirection = dir;
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
    };

    if (this.lastDirection !== null && this.lastDirection !== dir) {
      // Brief settle on an idle pose before turning to face the new
      // direction — a soft "notice, turn, then walk" beat instead of an
      // instant cut between directional sprites. The walk that follows
      // still runs at the same speed as always.
      this.onAnimationChange(pickRandom(IDLE_POOL));
      this.turnTimer = setTimeout(() => {
        if (this.unmounted) return;
        startTween();
      }, TURN_SETTLE_MS);
    } else {
      startTween();
    }
  }

  /**
   * Autonomous random wandering — anywhere in the container, no exclusions.
   * Picks a walk duration first (3-6s) and derives a reachable distance
   * from the constant speed, then a random direction — so the actual
   * on-screen pace stays constant no matter how far the pick lands,
   * instead of a long diagonal getting rushed to fit a time budget.
   */
  private wanderWalk = () => {
    if (this.sleeping) return;
    const durationMs = WANDER_MIN_MS + Math.random() * (WANDER_MAX_MS - WANDER_MIN_MS);
    const dist = WALK_SPEED_PX_PER_SEC * (durationMs / 1000) * (0.5 + Math.random() * 0.5);
    const angle = Math.random() * Math.PI * 2;
    const raw = { x: this.pos.x + Math.cos(angle) * dist, y: this.pos.y + Math.sin(angle) * dist };
    const dest = clampToContainer(raw.x, raw.y, this.catSize, this.containerSize());
    this.runWalk(dest, WALK_SPEED_PX_PER_SEC, WANDER_MIN_MS, WANDER_MAX_MS, () => {
      this.onAnimationChange(pickRandom(IDLE_POOL));
      this.scheduleNextIdle();
    });
  };

  /** Summoned by a double-tap — reacts immediately, still walks at an unhurried pace. */
  private commandWalkTo(clientX: number, clientY: number) {
    if (this.sleeping) return;
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
    if (this.turnTimer) clearTimeout(this.turnTimer);
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }

  private triggerClickReaction() {
    if (this.sleeping) return;
    this.pause();
    this.onReactingChange(true);
    this.onAnimationChange(pickRandom(CLICK_REACTION_POOL));
  }

  handleReactionComplete = () => {
    this.onReactingChange(false);
    this.onAnimationChange(pickRandom(IDLE_POOL));
    this.scheduleNextIdle();
  };

  /**
   * The cat's element has pointer-events:none (so it never blocks a tap on
   * real UI beneath it), which means the DOM event target is never the cat
   * — hit-testing is done against its current on-screen rect instead.
   */
  private isCatHit(clientX: number, clientY: number): boolean {
    if (!this.catEl) return false;
    const rect = this.catEl.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  }

  /** Call on pointerdown anywhere within the home page's interactive area. */
  handleMainPointerDown = (clientX: number, clientY: number) => {
    // Any press anywhere interrupts autonomous wandering immediately —
    // the user is about to interact, one way or another.
    this.pause();
    if (this.isCatHit(clientX, clientY)) {
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
