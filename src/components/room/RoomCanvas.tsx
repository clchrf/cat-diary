"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { CatSprite } from "@/components/cat/CatSprite";
import { useCatIdle } from "@/lib/useCatIdle";
import { getFurnitureById } from "@/lib/furniture";
import type { RoomPlacement } from "@/lib/types";

interface RoomCanvasProps {
  placements: RoomPlacement[];
  onMove: (id: string, x: number, y: number) => void;
  onDragEnd: (id: string) => void;
  onRemove: (id: string) => void;
  catPosition: { x: number; y: number };
  onCatMove: (x: number, y: number) => void;
  onCatDragEnd: (x: number, y: number) => void;
}

const ROOM_MAX_WIDTH = 340;
const ROOM_ASPECT = 320 / 420;
const CAT_SCALE = 3;
const CAT_SIZE = 32 * CAT_SCALE;
const DRAG_THRESHOLD = 8;

type DragTarget =
  | { type: "furniture"; id: string; offsetX: number; offsetY: number }
  | { type: "cat"; startClientX: number; startClientY: number; moved: boolean };

export function RoomCanvas({
  placements,
  onMove,
  onDragEnd,
  onRemove,
  catPosition,
  onCatMove,
  onCatDragEnd,
}: RoomCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<DragTarget | null>(null);
  const [catDragging, setCatDragging] = useState(false);
  const { animation, reacting, react, handleReactionComplete } = useCatIdle({ paused: catDragging });

  function handleFurniturePointerDown(e: React.PointerEvent, placement: RoomPlacement) {
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {
      // no-op — capture is a nice-to-have, dragging still works without it
    }
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;
    dragState.current = {
      type: "furniture",
      id: placement.id,
      offsetX: pointerX - placement.x,
      offsetY: pointerY - placement.y,
    };
  }

  function handleCatPointerDown(e: React.PointerEvent) {
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {
      // no-op — capture is a nice-to-have, dragging still works without it
    }
    dragState.current = {
      type: "cat",
      startClientX: e.clientX,
      startClientY: e.clientY,
      moved: false,
    };
  }

  function handlePointerMove(e: React.PointerEvent) {
    const drag = dragState.current;
    if (!drag) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (drag.type === "furniture") {
      const x = Math.max(0, Math.min(rect.width - 32, e.clientX - rect.left - drag.offsetX));
      const y = Math.max(0, Math.min(rect.height - 32, e.clientY - rect.top - drag.offsetY));
      onMove(drag.id, x, y);
      return;
    }

    // cat
    if (!drag.moved) {
      const dx = e.clientX - drag.startClientX;
      const dy = e.clientY - drag.startClientY;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      drag.moved = true;
      setCatDragging(true);
    }
    const maxX = Math.max(1, rect.width - CAT_SIZE);
    const maxY = Math.max(1, rect.height - CAT_SIZE);
    const px = Math.max(0, Math.min(maxX, e.clientX - rect.left - CAT_SIZE / 2));
    const py = Math.max(0, Math.min(maxY, e.clientY - rect.top - CAT_SIZE / 2));
    onCatMove(px / maxX, py / maxY);
  }

  function handlePointerUp() {
    const drag = dragState.current;
    if (!drag) return;
    if (drag.type === "furniture") {
      onDragEnd(drag.id);
    } else if (drag.type === "cat") {
      if (drag.moved) {
        onCatDragEnd(catPosition.x, catPosition.y);
        setCatDragging(false);
      } else {
        react();
      }
    }
    dragState.current = null;
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full touch-none overflow-hidden rounded-2xl border border-divider"
      style={{
        maxWidth: ROOM_MAX_WIDTH,
        aspectRatio: ROOM_ASPECT,
        background: "linear-gradient(#faf9f7 0%, #faf9f7 78%, #efe9e2 78%, #efe9e2 100%)",
      }}
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
            onDoubleClick={() => onRemove(p.id)}
            style={{
              position: "absolute",
              left: p.x,
              top: p.y,
              width: item.size,
              height: item.size,
              cursor: "grab",
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
        onPointerDown={handleCatPointerDown}
        style={{
          position: "absolute",
          left: `calc((100% - ${CAT_SIZE}px) * ${catPosition.x})`,
          top: `calc((100% - ${CAT_SIZE}px) * ${catPosition.y})`,
          cursor: catDragging ? "grabbing" : "grab",
          touchAction: "none",
        }}
        aria-label="貓咪，按住可拖曳"
      >
        <CatSprite
          animation={animation}
          scale={CAT_SCALE}
          fps={reacting ? 5 : 3}
          loop={!reacting}
          paused={catDragging}
          onLoopComplete={reacting ? handleReactionComplete : undefined}
        />
      </div>
    </div>
  );
}
