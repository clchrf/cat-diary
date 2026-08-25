"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Image from "next/image";
import { CatSprite } from "@/components/cat/CatSprite";
import { CAT_FRAME_SIZE, type CatColorway } from "@/lib/catSprite";
import { getFurnitureById } from "@/lib/furniture";
import { getRoomLayout, saveRoomPlacement, removeRoomPlacement, getCatPosition } from "@/lib/db";
import type { RoomPlacement } from "@/lib/types";
import { CatWalker } from "./CatWalker";

const CAT_SCALE = 2.5;
export const HOME_CAT_SIZE = CAT_FRAME_SIZE * CAT_SCALE;

interface HomeRoomProps {
  /** The page's own positioned container — the cat/furniture are rendered
   * as its direct children and all pointer handling attaches to it, so a
   * tap anywhere (including on real UI) is observed without ever
   * intercepting the click meant for that UI. */
  containerRef: RefObject<HTMLElement | null>;
  /** Relative (0..1) spawn point used only when no position has been saved yet. */
  defaultPosition?: { x: number; y: number };
  colorway?: CatColorway;
}

export function HomeRoom({ containerRef, defaultPosition, colorway = "black" }: HomeRoomProps) {
  const catElRef = useRef<HTMLDivElement | null>(null);
  const walkerRef = useRef<CatWalker | null>(null);
  if (walkerRef.current == null) walkerRef.current = new CatWalker(HOME_CAT_SIZE);

  const [ready, setReady] = useState(false);
  const [animation, setAnimation] = useState<string>("idle_sit");
  const [reacting, setReacting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [placements, setPlacements] = useState<RoomPlacement[]>([]);

  const furnitureDragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  useEffect(() => {
    const walker = walkerRef.current!;
    walker.onAnimationChange = setAnimation;
    walker.onDraggingChange = setDragging;
    walker.onReactingChange = setReacting;
    walker.onReady = () => setReady(true);
    if (containerRef.current && catElRef.current) {
      walker.attach(containerRef.current, catElRef.current);
    }
    walker.start(async () => {
      const [layout, catPos] = await Promise.all([getRoomLayout(), getCatPosition()]);
      setPlacements(layout);
      return catPos;
    });
    return () => walker.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    walkerRef.current?.setDefaultPosition(defaultPosition);
  }, [defaultPosition]);

  // Pointer handling lives on the shared page container (native listeners —
  // more reliable than React's synthetic system for iOS Safari touch
  // quirks) so a tap anywhere, including on real buttons, is observed for
  // the cat's tap/double-tap/drag logic without ever blocking the button's
  // own click.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onPointerDown(e: PointerEvent) {
      const furniture = (e.target as Element)?.closest?.('[data-furniture-id]');
      if (furniture) return; // furniture handles its own pointerdown
      walkerRef.current?.handleMainPointerDown(e.target, e.clientX, e.clientY);
    }
    function onPointerMove(e: PointerEvent) {
      if (furnitureDragRef.current) return;
      walkerRef.current?.handleMainPointerMove(e.clientX, e.clientY);
    }
    function onPointerUp(e: PointerEvent) {
      if (furnitureDragRef.current) return;
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

  function handleFurniturePointerDown(e: React.PointerEvent, placement: RoomPlacement) {
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {
      // no-op
    }
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    furnitureDragRef.current = {
      id: placement.id,
      offsetX: e.clientX - rect.left - placement.x,
      offsetY: e.clientY - rect.top - placement.y,
    };
  }

  function handleFurniturePointerMove(e: React.PointerEvent) {
    const drag = furnitureDragRef.current;
    if (!drag) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(rect.width - 32, e.clientX - rect.left - drag.offsetX));
    const y = Math.max(0, Math.min(rect.height - 32, e.clientY - rect.top - drag.offsetY));
    setPlacements((prev) => prev.map((p) => (p.id === drag.id ? { ...p, x, y } : p)));
  }

  function handleFurniturePointerUp() {
    const drag = furnitureDragRef.current;
    if (!drag) return;
    furnitureDragRef.current = null;
    setPlacements((prev) => {
      const p = prev.find((x) => x.id === drag.id);
      if (p) saveRoomPlacement(p);
      return prev;
    });
  }

  function handleRemoveFurniture(id: string) {
    removeRoomPlacement(id);
    setPlacements((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <>
      {placements.map((p) => {
        const item = getFurnitureById(p.id);
        if (!item) return null;
        return (
          <div
            key={p.id}
            data-furniture-id={p.id}
            onPointerDown={(e) => handleFurniturePointerDown(e, p)}
            onPointerMove={handleFurniturePointerMove}
            onPointerUp={handleFurniturePointerUp}
            onDoubleClick={() => handleRemoveFurniture(p.id)}
            style={{
              position: "absolute",
              left: p.x,
              top: p.y,
              width: item.size,
              height: item.size,
              cursor: "grab",
              touchAction: "none",
            }}
            title="拖曳移動，雙擊移除"
          >
            <Image
              src={item.sprite}
              alt={item.name}
              width={item.size}
              height={item.size}
              style={{ imageRendering: "pixelated" }}
              draggable={false}
            />
          </div>
        );
      })}

      <div
        ref={catElRef}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: HOME_CAT_SIZE,
          height: HOME_CAT_SIZE,
          opacity: ready ? 1 : 0,
          cursor: dragging ? "grabbing" : "grab",
          touchAction: "none",
          willChange: "transform",
        }}
        aria-label="貓咪，輕點互動、雙擊叫過來、按住可拖曳"
      >
        <CatSprite
          animation={animation}
          colorway={colorway}
          scale={CAT_SCALE}
          fps={reacting ? 5 : 3}
          loop={!reacting}
          paused={dragging}
          onLoopComplete={reacting ? () => walkerRef.current?.handleReactionComplete() : undefined}
        />
      </div>
    </>
  );
}
