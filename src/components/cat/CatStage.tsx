"use client";

import { useEffect, useState } from "react";
import { CatSprite } from "./CatSprite";
import { IDLE_POOL, CLICK_REACTION_POOL } from "@/lib/catSprite";

function pickRandom<T>(pool: readonly T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

export function CatStage({ colorway = "gray" as const }: { colorway?: "gray" | "ginger" | "white" }) {
  const [animation, setAnimation] = useState<string>("idle_sit");
  const [reacting, setReacting] = useState(false);
  const [bounce, setBounce] = useState(false);

  useEffect(() => {
    if (reacting) return;
    const interval = setInterval(() => {
      setAnimation(pickRandom(IDLE_POOL));
    }, 5000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, [reacting]);

  function handleClick() {
    if (reacting) return;
    setReacting(true);
    setBounce(true);
    setAnimation(pickRandom(CLICK_REACTION_POOL));
    setTimeout(() => setBounce(false), 220);
  }

  function handleReactionComplete() {
    setReacting(false);
    setAnimation(pickRandom(IDLE_POOL));
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
        fps={7}
        loop={!reacting}
        onLoopComplete={reacting ? handleReactionComplete : undefined}
      />
    </button>
  );
}
