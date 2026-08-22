"use client";

import Image from "next/image";
import { FURNITURE_CATALOG } from "@/lib/furniture";

interface FurnitureShopProps {
  cans: number;
  ownedIds: Set<string>;
  onBuy: (id: string) => void;
}

export function FurnitureShop({ cans, ownedIds, onBuy }: FurnitureShopProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {FURNITURE_CATALOG.map((item) => {
        const owned = ownedIds.has(item.id);
        const affordable = cans >= item.price;
        return (
          <div
            key={item.id}
            className="flex flex-col items-center gap-2 rounded-xl border border-divider p-3"
          >
            <Image
              src={item.sprite}
              alt={item.name}
              width={48}
              height={48}
              style={{ imageRendering: "pixelated" }}
            />
            <span className="text-center text-[13px] leading-tight">{item.name}</span>
            {owned ? (
              <span className="text-[12px] text-muted">已擁有</span>
            ) : (
              <button
                onClick={() => onBuy(item.id)}
                disabled={!affordable}
                className="rounded-full border border-divider px-4 py-2 text-[13px] disabled:opacity-40"
                style={{ minHeight: 40 }}
              >
                🥫 {item.price}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
