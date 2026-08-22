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
} from "@/lib/db";
import { getFurnitureById } from "@/lib/furniture";
import type { RoomPlacement } from "@/lib/types";

export default function RoomPage() {
  const [cans, setCans] = useState(0);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [placements, setPlacements] = useState<RoomPlacement[]>([]);

  async function refresh() {
    const [total, owned, layout] = await Promise.all([
      getCansTotal(),
      getOwnedFurniture(),
      getRoomLayout(),
    ]);
    setCans(total);
    setOwnedIds(new Set(owned.map((o) => o.id)));
    setPlacements(layout);
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

  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-6 px-5 pb-16 pt-6">
      <h1 className="self-start text-[17px] font-semibold">房間</h1>
      <div className="self-start text-[13px] text-muted">🥫 {cans}</div>

      <RoomCanvas
        placements={placements}
        onMove={handleMove}
        onDragEnd={handleMoveEnd}
        onRemove={handleRemove}
      />
      <p className="text-[11px] text-muted">拖曳家具可以移動位置，雙擊可以移除。</p>
      <div className="w-full">
        <div className="mb-3 text-[13px] font-medium">家具商店</div>
        <FurnitureShop cans={cans} ownedIds={ownedIds} onBuy={handleBuy} />
      </div>
    </main>
  );
}
