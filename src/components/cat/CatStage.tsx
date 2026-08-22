"use client";

import { useState } from "react";
import { CatSprite } from "./CatSprite";
import { useCatIdle } from "@/lib/useCatIdle";

export function CatStage({ colorway = "gray" as const }: { colorway?: "gray" | "ginger" | "white" }) {
  const { animation, reacting, react, handleReactionComplete } = useCatIdle();
  const [bounce, setBounce] = useState(false);

  function handleClick() {
    react();
    setBounce(true);
    setTimeout(() => setBounce(false), 220);
  }

  return (
    <button
      onClick={handleClick}
      aria-label="貓咪"
      className="flex items-center justify-center bg-transparent border-none p-0 cursor-pointer select-none"
      style={{
        transform: bounce ? "translateY(-10px)" : "translateY(0)",
        transition: "transform 180ms ease-out",
      }}
    >
      <CatSprite
        animation={animation}
        colorway={colorway}
        scale={5}
        fps={reacting ? 5 : 3}
        loop={!reacting}
        onLoopComplete={reacting ? handleReactionComplete : undefined}
      />
    </button>
  );
}
