"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { CatSprite } from "@/components/cat/CatSprite";
import { type CatColorway } from "@/lib/catSprite";
import { getCatPosition } from "@/lib/db";
import { CatWalker } from "./CatWalker";

const CAT_SCALE = 5;
export const HOME_CAT_SIZE = 32 * CAT_SCALE;

interface HomeRoomProps {
  /** The page's own positioned container — the cat is rendered as its
   * direct child and all pointer handling attaches to it, so a tap
   * anywhere (including on real UI) is observed without ever intercepting
   * the click meant for that UI. */
  containerRef: RefObject<HTMLElement | null>;
  /** Relative (0..1) spawn point used only when no position has been saved yet. */
  defaultPosition?: { x: number; y: number };
  colorway?: CatColorway;
  /** Driven by today's medication status — never by "not recorded yet". */
  sleeping?: boolean;
}

export function HomeRoom({ containerRef, defaultPosition, colorway = "gray", sleeping = false }: HomeRoomProps) {
  const catElRef = useRef<HTMLDivElement | null>(null);
  const walkerRef = useRef<CatWalker | null>(null);
  if (walkerRef.current == null) walkerRef.current = new CatWalker(HOME_CAT_SIZE);

  const [ready, setReady] = useState(false);
  const [animation, setAnimation] = useState<string>("idle_sit");
  const [reacting, setReacting] = useState(false);
  const [waking, setWaking] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const walker = walkerRef.current!;
    walker.onAnimationChange = setAnimation;
    walker.onDraggingChange = setDragging;
    walker.onReactingChange = setReacting;
    walker.onWakingChange = setWaking;
    walker.onReady = () => setReady(true);
    if (containerRef.current && catElRef.current) {
      walker.attach(containerRef.current, catElRef.current);
    }
    walker.start(async () => getCatPosition());
    return () => walker.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    walkerRef.current?.setDefaultPosition(defaultPosition);
  }, [defaultPosition]);

  useEffect(() => {
    walkerRef.current?.setSleeping(sleeping);
  }, [sleeping]);

  // Pointer handling lives on the shared page container (native listeners —
  // more reliable than React's synthetic system for iOS Safari touch
  // quirks) so a tap anywhere, including on real buttons, is observed for
  // the cat's tap/double-tap/drag logic without ever blocking the button's
  // own click. The cat element itself has pointer-events:none (see below),
  // so it is never the actual event target — CatWalker hit-tests the
  // pointer coordinates against the cat's own rect instead.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onPointerDown(e: PointerEvent) {
      walkerRef.current?.handleMainPointerDown(e.clientX, e.clientY);
    }
    function onPointerMove(e: PointerEvent) {
      walkerRef.current?.handleMainPointerMove(e.clientX, e.clientY);
    }
    function onPointerUp(e: PointerEvent) {
      walkerRef.current?.handleMainPointerUp(e.clientX, e.clientY);
    }

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={catElRef}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: HOME_CAT_SIZE,
        height: HOME_CAT_SIZE,
        opacity: ready ? 1 : 0,
        // Visually above buttons/text (z-30, higher than the button
        // layer's z-10) but pointer-events:none so it never intercepts a
        // tap — the cat can walk right over a button and the button stays
        // fully clickable, because the click passes straight through to it.
        zIndex: 30,
        pointerEvents: "none",
        willChange: "transform",
      }}
      aria-label="貓咪，輕點互動、雙擊叫過來、按住可拖曳"
    >
      <CatSprite
        animation={animation}
        colorway={colorway}
        scale={CAT_SCALE}
        fps={reacting || waking ? 5 : 3}
        loop={!reacting && !waking}
        paused={dragging}
        onLoopComplete={
          reacting
            ? () => walkerRef.current?.handleReactionComplete()
            : waking
              ? () => walkerRef.current?.handleWakeComplete()
              : undefined
        }
      />
    </div>
  );
}
