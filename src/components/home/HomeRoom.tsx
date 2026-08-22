"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CatSprite } from "@/components/cat/CatSprite";
import { type CatColorway } from "@/lib/catSprite";
import { type Rect } from "@/lib/roam";
import { getFurnitureById } from "@/lib/furniture";
import { getRoomLayout, saveRoomPlacement, removeRoomPlacement, getCatPosition } from "@/lib/db";
import type { RoomPlacement } from "@/lib/types";
import { CatWalker } from "./CatWalker";

const CAT_SCALE = 5;
export const HOME_CAT_SIZE = 32 * CAT_SCALE;
const DRAG_THRESHOLD = 8;

interface HomeRoomProps {
  blockedRects: Rect[];
  /** Relative (0..1) spawn point used only when no position has been saved yet. */
  defaultPosition?: { x: number; y: number };
  colorway?: CatColorway;
}

export function HomeRoom({ blockedRects, defaultPosition, colorway = "gray" }: HomeRoomProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
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
  }, []);

  useEffect(() => {
    walkerRef.current?.setDefaultPosition(defaultPosition);
  }, [defaultPosition]);

  useEffect(() => {
    walkerRef.current?.setBlockedRects(blockedRects);
  }, [blockedRects]);

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

  function handlePointerMove(e: React.PointerEvent) {
    const furnitureDrag = furnitureDragRef.current;
    if (furnitureDrag) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = Math.max(0, Math.min(rect.width - 32, e.clientX - rect.left - furnitureDrag.offsetX));
      const y = Math.max(0, Math.min(rect.height - 32, e.clientY - rect.top - furnitureDrag.offsetY));
      setPlacements((prev) => prev.map((p) => (p.id === furnitureDrag.id ? { ...p, x, y } : p)));
      return;
    }
    walkerRef.current?.handlePointerMove(e.clientX, e.clientY, DRAG_THRESHOLD);
  }

  function handlePointerUp() {
    const furnitureDrag = furnitureDragRef.current;
    if (furnitureDrag) {
      furnitureDragRef.current = null;
      setPlacements((prev) => {
        const p = prev.find((x) => x.id === furnitureDrag.id);
        if (p) saveRoomPlacement(p);
        return prev;
      });
      return;
    }
    walkerRef.current?.handlePointerUp();
  }

  function handleCatPointerDown(e: React.PointerEvent) {
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {
      // no-op
    }
    walkerRef.current?.handlePointerDown(e.clientX, e.clientY);
  }

  function handleRemoveFurniture(id: string) {
    removeRoomPlacement(id);
    setPlacements((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 touch-none"
      style={{ opacity: ready ? 1 : 0 }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {placements.map((p) => {
        const item = getFurnitureById(p.id);
        if (!item) return null;
        return (
          <div
            key={p.id}
            onPointerDown={(e) => handleFurniturePointerDown(e, p)}
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
        onPointerDown={handleCatPointerDown}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: HOME_CAT_SIZE,
          height: HOME_CAT_SIZE,
          cursor: dragging ? "grabbing" : "grab",
          touchAction: "none",
          willChange: "transform",
        }}
        aria-label="貓咪，輕點互動、雙擊走過去、按住可拖曳"
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
    </div>
  );
}
