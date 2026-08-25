"use client";

import { useEffect, useRef, useState } from "react";
import {
  CAT_ANIMATIONS,
  CAT_FRAME_SIZE,
  CAT_SHEET_WIDTH,
  CAT_SHEET_HEIGHT,
  CAT_SPRITE_SRC,
  type CatColorway,
} from "@/lib/catSprite";

interface CatSpriteProps {
  animation: string;
  colorway?: CatColorway;
  scale?: number;
  fps?: number;
  loop?: boolean;
  onLoopComplete?: () => void;
  flipX?: boolean;
  className?: string;
  /** Freezes the current frame — used while the cat is being dragged. */
  paused?: boolean;
}

export function CatSprite({
  animation,
  colorway = "black",
  scale = 4,
  fps = 3,
  loop = true,
  onLoopComplete,
  flipX = false,
  className,
  paused = false,
}: CatSpriteProps) {
  const def = CAT_ANIMATIONS[animation] ?? CAT_ANIMATIONS.idle_sit;
  const [frame, setFrame] = useState(0);
  const frameRef = useRef(0);
  const onLoopCompleteRef = useRef(onLoopComplete);

  useEffect(() => {
    onLoopCompleteRef.current = onLoopComplete;
  }, [onLoopComplete]);

  useEffect(() => {
    frameRef.current = 0;
    setFrame(0);
  }, [animation]);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      frameRef.current += 1;
      if (frameRef.current >= def.frames) {
        frameRef.current = 0;
        if (!loop) {
          onLoopCompleteRef.current?.();
        }
      }
      setFrame(frameRef.current);
    }, 1000 / fps);
    return () => clearInterval(interval);
  }, [animation, def.frames, fps, loop, paused]);

  const size = CAT_FRAME_SIZE * scale;
  const bgX = -(frame * CAT_FRAME_SIZE * scale);
  const bgY = -(def.row * CAT_FRAME_SIZE * scale);

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${CAT_SPRITE_SRC[colorway]})`,
        backgroundPosition: `${bgX}px ${bgY}px`,
        backgroundSize: `${CAT_SHEET_WIDTH * scale}px ${CAT_SHEET_HEIGHT * scale}px`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        transform: flipX ? "scaleX(-1)" : undefined,
      }}
      aria-hidden
    />
  );
}
