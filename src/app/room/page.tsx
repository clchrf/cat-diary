"use client";

import { useEffect, useState } from "react";
import { FurnitureShop } from "@/components/room/FurnitureShop";
import {
  getCansTotal,
  getOwnedFurniture,
  getRoomLayout,
  purchaseFurniture,
  addCans,
  saveRoomPlacement,
} from "@/lib/db";
import { getFurnitureById } from "@/lib/furniture";
import type { RoomPlacement } from "@/lib/types";

export default function RoomPage() {
  const [cans, setCans] = useState(0);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [placementCount, setPlacementCount] = useState(0);

  async function refresh() {
    const [total, owned, layout] = await Promise.all([
      getCansTotal(),
      getOwnedFurniture(),
      getRoomLayout(),
    ]);
    setCans(total);
    setOwnedIds(new Set(owned.map((o) => o.id)));
    setPlacementCount(layout.length);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleBuy(id: string) {
    const item = getFurnitureById(id);
    if (!item || cans < item.price) return;
    await purchaseFurniture(id);
    await addCans(-item.price, "furniture_purchase");
    const placement: RoomPlacement = {
      id,
      x: 24 + (placementCount % 4) * 20,
      y: 90 + Math.floor(placementCount / 4) * 20,
    };
    await saveRoomPlacement(placement);
    await refresh();
  }

  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-6 px-5 pb-16 pt-6">
      <h1 className="self-start text-[17px] font-semibold">房間</h1>
      <div className="self-start text-[13px] text-muted">🥫 {cans}</div>
      <p className="self-start text-[12px] leading-relaxed text-muted">
        買下的家具會直接出現在首頁貓咪活動的空間裡，回首頁就可以拖曳擺放。
      </p>
      <div className="w-full">
        <div className="mb-3 text-[13px] font-medium">家具商店</div>
        <FurnitureShop cans={cans} ownedIds={ownedIds} onBuy={handleBuy} />
      </div>
    </main>
  );
}
