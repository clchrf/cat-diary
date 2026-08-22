import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  DiaryEvent,
  AudioRecord,
  MedicationRecord,
  CompanionSession,
  CanLedgerEntry,
  OwnedFurniture,
  RoomPlacement,
  AppSettings,
  DailyMood,
  CatPosition,
} from "./types";

interface CatDiarySchema extends DBSchema {
  events: {
    key: string;
    value: DiaryEvent;
    indexes: { "by-dateKey": string; "by-createdAt": string };
  };
  audio: {
    key: string;
    value: AudioRecord;
    indexes: { "by-linkedRecordId": string };
  };
  medication: {
    key: string;
    value: MedicationRecord;
    indexes: { "by-dateKey": string };
  };
  companionSessions: {
    key: string;
    value: CompanionSession;
  };
  cans: {
    key: string;
    value: CanLedgerEntry;
  };
  furniture: {
    key: string;
    value: OwnedFurniture;
  };
  roomLayout: {
    key: string;
    value: RoomPlacement;
  };
  settings: {
    key: string;
    value: AppSettings;
  };
  dailyMoods: {
    key: string;
    value: DailyMood;
  };
  catPosition: {
    key: string;
    value: CatPosition;
  };
}

const DB_NAME = "cat-diary";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<CatDiarySchema>> | null = null;

export function getDb(): Promise<IDBPDatabase<CatDiarySchema>> {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB not available (server context)");
  }
  if (!dbPromise) {
    dbPromise = openDB<CatDiarySchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const events = db.createObjectStore("events", { keyPath: "id" });
          events.createIndex("by-dateKey", "dateKey");
          events.createIndex("by-createdAt", "createdAt");

          const audio = db.createObjectStore("audio", { keyPath: "id" });
          audio.createIndex("by-linkedRecordId", "linkedRecordId");

          const medication = db.createObjectStore("medication", { keyPath: "id" });
          medication.createIndex("by-dateKey", "dateKey");

          db.createObjectStore("companionSessions", { keyPath: "id" });
          db.createObjectStore("cans", { keyPath: "id" });
          db.createObjectStore("furniture", { keyPath: "id" });
          db.createObjectStore("roomLayout", { keyPath: "id" });
          db.createObjectStore("settings", { keyPath: "id" });
        }
        if (oldVersion < 2) {
          db.createObjectStore("dailyMoods", { keyPath: "dateKey" });
          db.createObjectStore("catPosition", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

// ---------- Events ----------
export async function saveEvent(event: DiaryEvent): Promise<void> {
  const db = await getDb();
  await db.put("events", event);
}

export async function getEvent(id: string): Promise<DiaryEvent | undefined> {
  const db = await getDb();
  return db.get("events", id);
}

export async function getAllEvents(): Promise<DiaryEvent[]> {
  const db = await getDb();
  const all = await db.getAll("events");
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getEventsByDateKey(dateKey: string): Promise<DiaryEvent[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex("events", "by-dateKey", dateKey);
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getEventsInDateKeys(dateKeys: string[]): Promise<DiaryEvent[]> {
  const set = new Set(dateKeys);
  const all = await getAllEvents();
  return all.filter((e) => set.has(e.dateKey));
}

export async function deleteEvent(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("events", id);
}

// ---------- Audio ----------
export async function saveAudio(record: AudioRecord): Promise<void> {
  const db = await getDb();
  await db.put("audio", record);
}

export async function getAudio(id: string): Promise<AudioRecord | undefined> {
  const db = await getDb();
  return db.get("audio", id);
}

export async function getAllAudio(): Promise<AudioRecord[]> {
  const db = await getDb();
  return db.getAll("audio");
}

// ---------- Medication ----------
export async function recordMedication(entry: MedicationRecord): Promise<void> {
  const db = await getDb();
  await db.put("medication", entry);
}

export async function getMedicationByDateKey(dateKey: string): Promise<MedicationRecord[]> {
  const db = await getDb();
  return db.getAllFromIndex("medication", "by-dateKey", dateKey);
}

export async function getAllMedication(): Promise<MedicationRecord[]> {
  const db = await getDb();
  return db.getAll("medication");
}

export async function getMedicationInDateKeys(dateKeys: string[]): Promise<MedicationRecord[]> {
  const set = new Set(dateKeys);
  const all = await getAllMedication();
  return all.filter((m) => set.has(m.dateKey));
}

// ---------- Companion sessions ----------
export async function saveCompanionSession(session: CompanionSession): Promise<void> {
  const db = await getDb();
  await db.put("companionSessions", session);
}

export async function getAllCompanionSessions(): Promise<CompanionSession[]> {
  const db = await getDb();
  return db.getAll("companionSessions");
}

// ---------- Cans ----------
export async function addCans(delta: number, reason: CanLedgerEntry["reason"]): Promise<number> {
  const db = await getDb();
  const entry: CanLedgerEntry = {
    id: crypto.randomUUID(),
    delta,
    reason,
    timestamp: new Date().toISOString(),
  };
  await db.put("cans", entry);
  return getCansTotal();
}

export async function getCansTotal(): Promise<number> {
  const db = await getDb();
  const all = await db.getAll("cans");
  return all.reduce((sum, e) => sum + e.delta, 0);
}

// ---------- Furniture ----------
export async function purchaseFurniture(id: string): Promise<void> {
  const db = await getDb();
  await db.put("furniture", { id, purchasedAt: new Date().toISOString() });
}

export async function getOwnedFurniture(): Promise<OwnedFurniture[]> {
  const db = await getDb();
  return db.getAll("furniture");
}

// ---------- Room layout ----------
export async function saveRoomPlacement(placement: RoomPlacement): Promise<void> {
  const db = await getDb();
  await db.put("roomLayout", placement);
}

export async function removeRoomPlacement(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("roomLayout", id);
}

export async function getRoomLayout(): Promise<RoomPlacement[]> {
  const db = await getDb();
  return db.getAll("roomLayout");
}

// ---------- Daily mood ----------
export async function getDailyMood(dateKey: string): Promise<DailyMood | undefined> {
  const db = await getDb();
  return db.get("dailyMoods", dateKey);
}

export async function getDailyMoodsInDateKeys(dateKeys: string[]): Promise<DailyMood[]> {
  const db = await getDb();
  const all = await db.getAll("dailyMoods");
  const set = new Set(dateKeys);
  return all.filter((m) => set.has(m.dateKey));
}

export async function saveDailyMood(mood: DailyMood): Promise<void> {
  const db = await getDb();
  await db.put("dailyMoods", mood);
}

// ---------- Cat position ----------
const CAT_POSITION_ID = "room-cat";

export async function getCatPosition(): Promise<CatPosition | undefined> {
  const db = await getDb();
  return db.get("catPosition", CAT_POSITION_ID);
}

export async function saveCatPosition(x: number, y: number): Promise<void> {
  const db = await getDb();
  await db.put("catPosition", { id: CAT_POSITION_ID, x, y });
}

// ---------- Settings ----------
export async function getSettings(): Promise<AppSettings> {
  const db = await getDb();
  const s = await db.get("settings", "app");
  return s ?? { id: "app", pinEnabled: false };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDb();
  await db.put("settings", settings);
}

// ---------- Export / Import / Clear ----------
export async function exportAllData(): Promise<Record<string, unknown[]>> {
  const db = await getDb();
  const storeNames = [
    "events",
    "audio",
    "medication",
    "companionSessions",
    "cans",
    "furniture",
    "roomLayout",
    "dailyMoods",
    "catPosition",
    "settings",
  ] as const;
  const result: Record<string, unknown[]> = {};
  for (const name of storeNames) {
    const all = await db.getAll(name);
    if (name === "audio") {
      // convert blobs to base64 for JSON export
      result[name] = await Promise.all(
        (all as AudioRecord[]).map(async (a) => ({
          ...a,
          audioBlob: await blobToBase64(a.audioBlob),
        }))
      );
    } else {
      result[name] = all;
    }
  }
  return result;
}

export async function importAllData(data: Record<string, unknown[]>): Promise<void> {
  const db = await getDb();
  const storeNames = [
    "events",
    "audio",
    "medication",
    "companionSessions",
    "cans",
    "furniture",
    "roomLayout",
    "dailyMoods",
    "catPosition",
    "settings",
  ] as const;
  for (const name of storeNames) {
    const rows = data[name];
    if (!Array.isArray(rows)) continue;
    const tx = db.transaction(name, "readwrite");
    for (const row of rows) {
      if (name === "audio") {
        const a = row as AudioRecord & { audioBlob: string };
        const blob = await base64ToBlob(a.audioBlob);
        await tx.store.put({ ...a, audioBlob: blob });
      } else {
        await tx.store.put(row as never);
      }
    }
    await tx.done;
  }
}

export async function clearAllData(): Promise<void> {
  const db = await getDb();
  const storeNames = [
    "events",
    "audio",
    "medication",
    "companionSessions",
    "cans",
    "furniture",
    "roomLayout",
    "dailyMoods",
    "catPosition",
    "settings",
  ] as const;
  for (const name of storeNames) {
    await db.clear(name);
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:${blob.type};base64,${btoa(binary)}`;
}

async function base64ToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}
