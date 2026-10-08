import type { ChapterBlock, LetterBlock } from "./types";

const LETTER_OPEN = /^:::\s*letter\s*$/i;
const BLOCK_CLOSE = /^:::\s*$/;
const BREAK_LINE = /^\s*(\*\s*){3,}$|^\s*(—\s*){3,}$|^\s*(-\s*){3,}$/;

function flushParagraph(buffer: string[], out: string[]) {
  const text = buffer.join("\n").trim();
  if (text) out.push(text);
  buffer.length = 0;
}

function parseLetter(lines: string[]): LetterBlock {
  const body: string[] = [];
  let salutation: string | undefined;
  let signature: string | undefined;
  const buffer: string[] = [];

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!salutation && body.length === 0 && buffer.length === 0 && line.startsWith("> ")) {
      salutation = line.slice(2).trim();
      continue;
    }
    if (line.startsWith("-- ")) {
      flushParagraph(buffer, body);
      signature = line.slice(3).trim();
      continue;
    }
    if (line.trim() === "") {
      flushParagraph(buffer, body);
      continue;
    }
    buffer.push(line.trim());
  }
  flushParagraph(buffer, body);
  return { kind: "letter", salutation, paragraphs: body, signature };
}

export function parseChapterText(text: string): ChapterBlock[] {
  const blocks: ChapterBlock[] = [];
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const buffer: string[] = [];
  const paragraphs: string[] = [];
  let letter: string[] | null = null;

  const commitParagraphs = () => {
    flushParagraph(buffer, paragraphs);
    for (const p of paragraphs) blocks.push({ kind: "paragraph", text: p });
    paragraphs.length = 0;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (letter) {
      if (BLOCK_CLOSE.test(line)) {
        blocks.push(parseLetter(letter));
        letter = null;
      } else {
        letter.push(line);
      }
      continue;
    }
    if (LETTER_OPEN.test(line)) {
      commitParagraphs();
      letter = [];
      continue;
    }
    if (BREAK_LINE.test(line)) {
      commitParagraphs();
      blocks.push({ kind: "break" });
      continue;
    }
    if (line.trim() === "") {
      flushParagraph(buffer, paragraphs);
      continue;
    }
    buffer.push(line.trim());
  }
  if (letter) blocks.push(parseLetter(letter));
  commitParagraphs();
  return blocks;
}

export function countCharacters(blocks: ChapterBlock[]) {
  let total = 0;
  for (const block of blocks) {
    if (block.kind === "paragraph") total += block.text.replace(/\s/g, "").length;
    if (block.kind === "letter") {
      total += (block.salutation ?? "").length + (block.signature ?? "").length;
      for (const p of block.paragraphs) total += p.replace(/\s/g, "").length;
    }
  }
  return total;
}
