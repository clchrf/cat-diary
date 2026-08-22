"use client";

import { useRef } from "react";
import Image from "next/image";
import { CatSprite } from "@/components/cat/CatSprite";
import { getFurnitureById } from "@/lib/furniture";
import type { RoomPlacement } from "@/lib/types";

interface RoomCanvasProps {
  placements: RoomPlacement[];
  onMove: (id: string, x: number, y: number) => void;
  onDragEnd: (id: string) => void;
  onRemove: (id: string) => void;
}

const ROOM_MAX_WIDTH = 340;
const ROOM_ASPECT = 320 / 420;

export function RoomCanvas({ placements, onMove, onDragEnd, onRemove }: RoomCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  function handlePointerDown(e: React.PointerEvent, placement: RoomPlacement) {
    (e.target as Element).setPointerCapture(e.pointerId);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;
    dragState.current = {
      id: placement.id,
      offsetX: pointerX - placement.x,
      offsetY: pointerY - placement.y,
    };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragState.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(rect.width - 32, e.clientX - rect.left - dragState.current.offsetX));
    const y = Math.max(0, Math.min(rect.height - 32, e.clientY - rect.top - dragState.current.offsetY));
    onMove(dragState.current.id, x, y);
  }

  function handlePointerUp() {
    if (dragState.current) {
      onDragEnd(dragState.current.id);
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
            onPointerDown={(e) => handlePointerDown(e, p)}
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

      <div style={{ position: "absolute", left: "50%", bottom: "8%", transform: "translateX(-50%)" }}>
        <CatSprite animation="idle_sit" scale={3} fps={5} />
      </div>
    </div>
  );
}
