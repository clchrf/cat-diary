// Frame manifest for the Last Tick "32x32 Pixel Kittens Cats - Animated NPC" free pack.
// Sheet layout verified against the pack's labeled reference sheet
// (assets-raw/extracted/Free pack/cat 16x16 with text.png): each named animation
// occupies one 32px-tall row band, frames are 32x32, laid out left to right.
export interface CatAnimationDef {
  row: number; // 0-based row index in the sheet (row * 32 = y offset)
  frames: number;
}

export const CAT_FRAME_SIZE = 32;
export const CAT_SHEET_WIDTH = 352;
export const CAT_SHEET_HEIGHT = 1696;

export const CAT_ANIMATIONS: Record<string, CatAnimationDef> = {
  idle_sit: { row: 0, frames: 6 },
  idle_tailwag: { row: 1, frames: 8 },
  idle_groom: { row: 2, frames: 6 },
  idle_lie: { row: 3, frames: 10 },
  walk_down: { row: 4, frames: 4 },
  walk_up: { row: 5, frames: 4 },
  walk_right: { row: 6, frames: 8 },
  walk_left: { row: 7, frames: 8 },
  sleep: { row: 12, frames: 2 },
  meow: { row: 28, frames: 3 },
  meow_stand: { row: 29, frames: 3 },
  yawn: { row: 32, frames: 8 },
};

export type CatColorway = "gray" | "ginger" | "white";

export const CAT_SPRITE_SRC: Record<CatColorway, string> = {
  gray: "/sprites/cat/cat-gray.png",
  ginger: "/sprites/cat/cat-ginger.png",
  white: "/sprites/cat/cat-white.png",
};

export const IDLE_POOL = ["idle_sit", "idle_tailwag", "idle_groom"] as const;
export const CLICK_REACTION_POOL = ["idle_tailwag", "meow", "meow_stand", "idle_groom"] as const;
