"use client";

import Link from "next/link";
import { type CSSProperties, useEffect, useState } from "react";
import { chapterHref, chapterLabel, volumeHref, type Volume } from "../../lib/novel";
import { loadLastRead, loadVolumeProgress } from "../../lib/novel/progress";
import { EnvelopeArt } from "./envelope";

type ShelfState = Record<string, { read: number; finished: number }>;

export function LetterCase({ volumes }: { volumes: Volume[] }) {
  const [shelf, setShelf] = useState<ShelfState>({});
  const [last, setLast] = useState<{ volume: Volume; slug: string; title: string; label: string } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Progress lives in localStorage; read it after paint so the server markup hydrates untouched.
    const frame = requestAnimationFrame(() => {
      const next: ShelfState = {};
      for (const volume of volumes) {
        const map = loadVolumeProgress(volume.id, volume.chapters.map((chapter) => chapter.slug));
        next[volume.id] = { read: map.size, finished: [...map.values()].filter((item) => item.finished).length };
      }
      setShelf(next);
      const recent = loadLastRead();
      if (recent) {
        const volume = volumes.find((item) => item.id === recent.volumeId);
        const chapter = volume?.chapters.find((item) => item.slug === recent.slug);
        if (volume && chapter) setLast({ volume, slug: chapter.slug, title: chapter.title, label: chapterLabel(chapter) });
      }
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [volumes]);

  return (
    <>
      <div className={`case-continue ${ready && last ? "is-visible" : ""}`} aria-live="polite">
        {last && (
          <Link href={chapterHref(last.volume.id, last.slug)} className="case-continue-link">
            <span className="case-continue-label">继续上次</span>
            <span className="case-continue-title">
              {last.volume.numeral} · {last.label} <em>{last.title}</em>
            </span>
            <span aria-hidden="true" className="case-continue-arrow">→</span>
          </Link>
        )}
      </div>

      <ol className="envelope-stack" aria-label="原著各卷">
        {volumes.map((volume, index) => {
          const progress = shelf[volume.id];
          const total = volume.chapters.length;
          const finished = progress?.finished ?? 0;
          const started = progress?.read ?? 0;
          return (
            <li key={volume.id} style={{ "--i": index } as CSSProperties}>
              <Link
                href={volumeHref(volume.id)}
                className="envelope-link"
                aria-label={`${volume.title} ${volume.subtitle}，共 ${total} 章${finished ? `，已读完 ${finished} 章` : ""}`}
              >
                <EnvelopeArt volume={volume} />
                <span className="envelope-caption">
                  <span className="envelope-caption-count">
                    {total} 封 · {volume.characters >= 1000 ? `${Math.round(volume.characters / 1000)} 千字` : volume.characters ? `${volume.characters} 字` : "待抄录"}
                  </span>
                  <span className="envelope-caption-progress" data-state={finished === total && total > 0 ? "done" : started ? "reading" : "sealed"}>
                    <i style={{ "--p": total ? finished / total : 0 } as CSSProperties} />
                    <span>{finished === total && total > 0 ? "已读完" : started ? `已拆 ${started} / ${total}` : "封缄中"}</span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </>
  );
}
