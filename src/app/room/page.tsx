"use client";

import { useEffect, useState } from "react";
import { RoomCanvas } from "@/components/room/RoomCanvas";
import { FurnitureShop } from "@/components/room/FurnitureShop";
import {
  getCansTotal,
  getOwnedFurniture,
  getRoomLayout,
  purchaseFurniture,
  addCans,
  saveRoomPlacement,
  removeRoomPlacement,
  getCatPosition,
  saveCatPosition,
} from "@/lib/db";
import { getFurnitureById } from "@/lib/furniture";
import type { RoomPlacement } from "@/lib/types";

const DEFAULT_CAT_POSITION = { x: 0.5, y: 0.72 };

export default function RoomPage() {
  const [cans, setCans] = useState(0);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [placements, setPlacements] = useState<RoomPlacement[]>([]);
  const [catPos, setCatPos] = useState(DEFAULT_CAT_POSITION);

  async function refresh() {
    const [total, owned, layout, cat] = await Promise.all([
      getCansTotal(),
      getOwnedFurniture(),
      getRoomLayout(),
      getCatPosition(),
    ]);
    setCans(total);
    setOwnedIds(new Set(owned.map((o) => o.id)));
    setPlacements(layout);
    if (cat) setCatPos({ x: cat.x, y: cat.y });
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleBuy(id: string) {
    const item = getFurnitureById(id);
    if (!item || cans < item.price) return;
    await purchaseFurniture(id);
    await addCans(-item.price, "furniture_purchase");
    const placement: RoomPlacement = { id, x: 20 + placements.length * 12, y: 20 };
    await saveRoomPlacement(placement);
    await refresh();
  }

  async function handleMove(id: string, x: number, y: number) {
    setPlacements((prev) => prev.map((p) => (p.id === id ? { ...p, x, y } : p)));
  }

  async function handleMoveEnd(id: string) {
    const p = placements.find((p) => p.id === id);
    if (p) await saveRoomPlacement(p);
  }

  async function handleRemove(id: string) {
    await removeRoomPlacement(id);
    setPlacements((prev) => prev.filter((p) => p.id !== id));
  }

  function handleCatMove(x: number, y: number) {
    setCatPos({ x, y });
  }

  async function handleCatDragEnd(x: number, y: number) {
    await saveCatPosition(x, y);
  }

  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-6 px-5 pb-16 pt-6">
      <h1 className="self-start text-[17px] font-semibold">房間</h1>
      <div className="self-start text-[13px] text-muted">🥫 {cans}</div>

      <RoomCanvas
        placements={placements}
        onMove={handleMove}
        onDragEnd={handleMoveEnd}
        onRemove={handleRemove}
        catPosition={catPos}
        onCatMove={handleCatMove}
        onCatDragEnd={handleCatDragEnd}
      />
      <p className="text-[11px] text-muted">貓咪跟家具都可以按住拖曳；輕點貓咪會有反應，雙擊家具可以移除。</p>
      <div className="w-full">
        <div className="mb-3 text-[13px] font-medium">家具商店</div>
        <FurnitureShop cans={cans} ownedIds={ownedIds} onBuy={handleBuy} />
      </div>
    </main>
  );
}
