export type VolumeId = "i" | "ii" | "iii" | "iv";

export type ChapterSource = {
  /** URL slug, stable once published; progress is keyed on it. */
  slug: string;
  /** Chapter title shown on the envelope contents sheet and in the reader. */
  title: string;
  /** Optional short line shown under the title (an addressee, a place, a season). */
  note?: string;
  /** Sample sheets are shown for layout preview only and are not numbered. */
  sample?: boolean;
  /**
   * Chapter text. Blank lines separate paragraphs.
   * Wrap an in-story letter between `:::letter` and `:::` lines; the first line
   * starting with `> ` inside the block becomes the salutation, the last line
   * starting with `-- ` becomes the signature.
   * Leave empty until the owner-provided translation is in place.
   */
  text: string;
};

export type VolumeSource = {
  id: VolumeId;
  numeral: string;
  title: string;
  subtitle: string;
  /** Japanese publication date, used on the postmark. */
  published: string;
  /** One line written across the envelope, like an address. */
  addressee: string;
  /** Short note about the translation source; shown in the volume sheet. */
  provenance: string;
  /** Postage colour for the envelope seal and stripe accents. */
  tone: "blue" | "ivory" | "gold" | "wine";
  chapters: ChapterSource[];
};

export type LetterBlock = {
  kind: "letter";
  salutation?: string;
  paragraphs: string[];
  signature?: string;
};

export type ParagraphBlock = { kind: "paragraph"; text: string };
export type BreakBlock = { kind: "break" };

export type ChapterBlock = ParagraphBlock | LetterBlock | BreakBlock;

export type Chapter = ChapterSource & {
  index: number;
  /** 1-based number among real chapters; undefined for sample sheets. */
  ordinal?: number;
  volumeId: VolumeId;
  blocks: ChapterBlock[];
  characters: number;
  /** Rough reading time in minutes at ~400 characters per minute. */
  minutes: number;
  /** True when the chapter text has not been supplied yet. */
  pending: boolean;
};

export type Volume = Omit<VolumeSource, "chapters"> & {
  index: number;
  chapters: Chapter[];
  characters: number;
  pendingChapters: number;
};
