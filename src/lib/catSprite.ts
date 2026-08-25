// Frame manifest for the Last Tick "64x64 FREE Pixel Cats animated NPC" free pack.
// Sheet layout identified by grid analysis (64x64 cells, 14 cols x 72 rows, real
// content in rows 0-65) plus direct visual inspection of cropped row segments —
// this pack's reference sheet has no usable text labels, unlike the previous pack.
export interface CatAnimationDef {
  row: number; // 0-based row index in the sheet (row * 64 = y offset)
  frames: number;
}

export const CAT_FRAME_SIZE = 64;
export const CAT_SHEET_WIDTH = 896;
export const CAT_SHEET_HEIGHT = 4608;

export const CAT_ANIMATIONS: Record<string, CatAnimationDef> = {
  idle_sit: { row: 0, frames: 4 },
  idle_tailwag: { row: 1, frames: 4 },
  idle_groom: { row: 2, frames: 6 },
  idle_lie: { row: 27, frames: 3 },
  walk_down: { row: 24, frames: 5 },
  walk_up: { row: 23, frames: 5 },
  walk_right: { row: 26, frames: 5 },
  walk_left: { row: 25, frames: 5 },
  sleep: { row: 44, frames: 2 },
  meow: { row: 27, frames: 3 },
  meow_stand: { row: 2, frames: 6 },
};

export type CatColorway = "black" | "ginger" | "white";

export const CAT_SPRITE_SRC: Record<CatColorway, string> = {
  black: "/sprites/cat/cat-black.png",
  ginger: "/sprites/cat/cat-ginger.png",
  white: "/sprites/cat/cat-white.png",
};

export const IDLE_POOL = ["idle_sit", "idle_tailwag", "idle_groom"] as const;
export const CLICK_REACTION_POOL = ["idle_tailwag", "meow", "meow_stand", "idle_groom"] as const;
