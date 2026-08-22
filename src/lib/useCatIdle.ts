import { useEffect, useState } from "react";
import { IDLE_POOL, CLICK_REACTION_POOL } from "./catSprite";

function pickRandom<T>(pool: readonly T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

interface UseCatIdleOptions {
  /** Pause idle cycling (e.g. while the cat is being dragged). */
  paused?: boolean;
}

export function useCatIdle({ paused = false }: UseCatIdleOptions = {}) {
  const [animation, setAnimation] = useState<string>("idle_sit");
  const [reacting, setReacting] = useState(false);

  useEffect(() => {
    if (reacting || paused) return;
    // Slow, natural idle cycling — not a fast repeating loop.
    const interval = setInterval(() => {
      setAnimation(pickRandom(IDLE_POOL));
    }, 9000 + Math.random() * 5000);
    return () => clearInterval(interval);
  }, [reacting, paused]);

  function react() {
    if (reacting) return;
    setReacting(true);
    setAnimation(pickRandom(CLICK_REACTION_POOL));
  }

  function handleReactionComplete() {
    setReacting(false);
    setAnimation(pickRandom(IDLE_POOL));
  }

  return { animation, reacting, react, handleReactionComplete };
}
