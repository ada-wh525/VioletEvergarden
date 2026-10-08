import { VOLUME_I } from "./content/volume-i";
import { VOLUME_II } from "./content/volume-ii";
import { VOLUME_III } from "./content/volume-iii";
import { VOLUME_IV } from "./content/volume-iv";
import { countCharacters, parseChapterText } from "./parse";
import type { Chapter, Volume, VolumeId, VolumeSource } from "./types";

export type { Chapter, ChapterBlock, LetterBlock, Volume, VolumeId } from "./types";

const SOURCES: VolumeSource[] = [VOLUME_I, VOLUME_II, VOLUME_III, VOLUME_IV];

function buildVolume(source: VolumeSource, index: number): Volume {
  let ordinal = 0;
  const chapters: Chapter[] = source.chapters.map((chapter, chapterIndex) => {
    const blocks = parseChapterText(chapter.text);
    const characters = countCharacters(blocks);
    if (!chapter.sample) ordinal += 1;
    return {
      ...chapter,
      index: chapterIndex,
      ordinal: chapter.sample ? undefined : ordinal,
      volumeId: source.id,
      blocks,
      characters,
      minutes: Math.max(1, Math.round(characters / 400)),
      pending: characters === 0,
    };
  });
  const { chapters: _omit, ...meta } = source;
  void _omit;
  return {
    ...meta,
    index,
    chapters,
    characters: chapters.reduce((sum, chapter) => sum + chapter.characters, 0),
    pendingChapters: chapters.filter((chapter) => chapter.pending).length,
  };
}

export const VOLUMES: Volume[] = SOURCES.map(buildVolume);

export function getVolume(id: string): Volume | undefined {
  return VOLUMES.find((volume) => volume.id === id);
}

export function getChapter(volumeId: string, slug: string) {
  const volume = getVolume(volumeId);
  const chapter = volume?.chapters.find((item) => item.slug === slug);
  if (!volume || !chapter) return undefined;
  const previous = volume.chapters[chapter.index - 1];
  const next = volume.chapters[chapter.index + 1];
  const nextVolume = !next ? VOLUMES[volume.index + 1] : undefined;
  return { volume, chapter, previous, next, nextVolume };
}

export function chapterHref(volumeId: VolumeId, slug: string) {
  return `/read/${volumeId}/${slug}`;
}

export function volumeHref(volumeId: VolumeId) {
  return `/read/${volumeId}`;
}

export const CHAPTER_NUMERALS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二", "十三", "十四", "十五", "十六"];

export function chapterNumeral(index: number) {
  return CHAPTER_NUMERALS[index] ?? String(index + 1);
}

/** "第三章" for numbered chapters, "样张" for sample sheets. */
export function chapterLabel(chapter: Pick<Chapter, "ordinal">) {
  return chapter.ordinal ? `第${chapterNumeral(chapter.ordinal - 1)}章` : "样张";
}
