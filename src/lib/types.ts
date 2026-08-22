export const EMOTION_OPTIONS = [
  { key: "happy", label: "開心", emoji: "😊" },
  { key: "calm", label: "平靜", emoji: "😐" },
  { key: "sad", label: "難過", emoji: "😞" },
  { key: "angry", label: "生氣", emoji: "😠" },
  { key: "anxious", label: "焦慮", emoji: "😰" },
  { key: "tired", label: "疲累", emoji: "😴" },
  { key: "confused", label: "困惑", emoji: "😕" },
] as const;

export type EmotionKey = (typeof EMOTION_OPTIONS)[number]["key"];

export interface TextOrVoiceField {
  text: string;
  audioId?: string;
}

export interface AiEmotionSuggestion {
  secondaryEmotions: string[];
  confirmed: boolean;
  userAdjustedEmotions?: string[];
}

export interface AiAnalysis {
  summary?: string;
  primaryEmotion?: string;
  secondaryEmotions?: string[];
  eventType?: string;
  generatedAt: string;
  confirmed: boolean;
}

export interface LaterReflection {
  currentEmotion?: string;
  currentView?: string;
  finalOutcome?: string;
  updatedAt: string;
}

export interface ExpectationVsActual {
  expected?: string;
  actual?: string;
}

export interface NeedsAttention {
  flagged: boolean;
  confidence: "certain" | "uncertain" | "none";
  summary?: string;
}

export interface DiaryEvent {
  id: string;
  createdAt: string; // ISO UTC
  dateKey: string; // YYYY-MM-DD in Asia/Taipei
  whatHappened?: TextOrVoiceField;
  firstReaction?: TextOrVoiceField;
  emotions?: EmotionKey[];
  emotionsCustom?: string;
  wantToDo?: TextOrVoiceField;
  displayedMindset?: TextOrVoiceField;
  howHandled?: TextOrVoiceField;
  aiAnalysis?: AiAnalysis;
  laterReflection?: LaterReflection;
  expectationVsActual?: ExpectationVsActual;
  needsAttention?: NeedsAttention;
}

export interface AudioRecord {
  id: string;
  timestamp: string; // ISO UTC
  duration: number; // seconds
  audioBlob: Blob;
  transcript?: string;
  transcriptEditedByUser?: boolean;
  linkedRecordId?: string;
  linkedField?: string;
}

export interface MedicationRecord {
  id: string;
  dateKey: string;
  timestamp: string;
}

export interface CompanionSession {
  id: string;
  timestamp: string;
  durationSeconds: number;
  completed: boolean;
}

export interface CanLedgerEntry {
  id: string;
  delta: number;
  reason: "companion" | "record" | "medication" | "furniture_purchase";
  timestamp: string;
}

export interface OwnedFurniture {
  id: string; // furnitureId
  purchasedAt: string;
}

export interface RoomPlacement {
  id: string; // furnitureId
  x: number;
  y: number;
  z?: number;
}

export interface AppSettings {
  id: "app";
  pinEnabled: boolean;
  pinHash?: string;
  lastReminderEmailDateKey?: string;
  aiConsentAcknowledged?: boolean;
}
