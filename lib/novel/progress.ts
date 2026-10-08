"use client";

export type ReadSettings = {
  size: "s" | "m" | "l";
  leading: "tight" | "normal" | "loose";
  theme: "ivory" | "lamp" | "prussian";
};

export type ChapterProgress = {
  paragraph: number;
  ratio: number;
  finished: boolean;
  updatedAt: number;
};

const SETTINGS_KEY = "violet-read-settings";
const PROGRESS_PREFIX = "violet-read-progress:";
const LAST_KEY = "violet-read-last";

export const DEFAULT_SETTINGS: ReadSettings = { size: "m", leading: "normal", theme: "ivory" };

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadSettings(): ReadSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...(safeParse<Partial<ReadSettings>>(localStorage.getItem(SETTINGS_KEY)) ?? {}) };
}

export function saveSettings(settings: ReadSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable */
  }
}

export function progressKey(volumeId: string, slug: string) {
  return `${PROGRESS_PREFIX}${volumeId}/${slug}`;
}

export function loadProgress(volumeId: string, slug: string): ChapterProgress | null {
  if (typeof window === "undefined") return null;
  return safeParse<ChapterProgress>(localStorage.getItem(progressKey(volumeId, slug)));
}

export function saveProgress(volumeId: string, slug: string, progress: Omit<ChapterProgress, "updatedAt">) {
  try {
    localStorage.setItem(progressKey(volumeId, slug), JSON.stringify({ ...progress, updatedAt: Date.now() }));
    localStorage.setItem(LAST_KEY, JSON.stringify({ volumeId, slug, updatedAt: Date.now() }));
  } catch {
    /* storage unavailable */
  }
}

export function loadLastRead(): { volumeId: string; slug: string; updatedAt: number } | null {
  if (typeof window === "undefined") return null;
  return safeParse(localStorage.getItem(LAST_KEY));
}

export function loadVolumeProgress(volumeId: string, slugs: string[]) {
  const map = new Map<string, ChapterProgress>();
  for (const slug of slugs) {
    const item = loadProgress(volumeId, slug);
    if (item) map.set(slug, item);
  }
  return map;
}
