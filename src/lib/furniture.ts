export interface FurnitureCatalogItem {
  id: string;
  name: string;
  price: number;
  sprite: string;
  size: number; // rendered square size in px at 1x
}

// v1 catalog: only items with real, correctly-licensed art are included.
// The cat pack + this "plants" set are the free tier of Last Tick's
// "Pixel Interiors 32x32" pack. The paid "Room pack.zip" ($3+, same author)
// adds bed/sofa/table/shelf/rug/window art — once purchased and supplied,
// add entries here pointing at the new sprite files.
export const FURNITURE_CATALOG: FurnitureCatalogItem[] = [
  { id: "plant1", name: "盆栽", price: 10, sprite: "/sprites/furniture/plant1.png", size: 32 },
  { id: "plant2", name: "盆栽（尖葉）", price: 10, sprite: "/sprites/furniture/plant2.png", size: 32 },
  { id: "plant3", name: "盆栽（開花）", price: 15, sprite: "/sprites/furniture/plant3.png", size: 32 },
  { id: "plant4", name: "大型植物", price: 15, sprite: "/sprites/furniture/plant4.png", size: 32 },
];

export function getFurnitureById(id: string): FurnitureCatalogItem | undefined {
  return FURNITURE_CATALOG.find((f) => f.id === id);
}
