"use client";

import Link from "next/link";
import { type CSSProperties, useEffect, useState } from "react";
import { chapterHref, chapterLabel, type Volume } from "../../lib/novel";
import { type ChapterProgress, loadVolumeProgress } from "../../lib/novel/progress";
import { EnvelopeArt } from "./envelope";

export function VolumeSheet({ volume }: { volume: Volume }) {
  const [progress, setProgress] = useState<Map<string, ChapterProgress>>(new Map());
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setProgress(loadVolumeProgress(volume.id, volume.chapters.map((chapter) => chapter.slug)));
    });
    const timer = window.setTimeout(() => setOpened(true), 120);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [volume]);

  const resume = (() => {
    let best: { slug: string; updatedAt: number } | null = null;
    for (const [slug, item] of progress) {
      if (!item.finished && (!best || item.updatedAt > best.updatedAt)) best = { slug, updatedAt: item.updatedAt };
    }
    if (best) return volume.chapters.find((chapter) => chapter.slug === best!.slug);
    const firstUnread = volume.chapters.find((chapter) => !progress.get(chapter.slug)?.finished && !chapter.pending);
    return firstUnread ?? volume.chapters.find((chapter) => !chapter.pending);
  })();

  const finished = [...progress.values()].filter((item) => item.finished).length;

  return (
    <>
      <section className={`volume-opening ${opened ? "is-open" : ""}`} aria-labelledby="volume-title">
        <div className="volume-pocket">
          <EnvelopeArt volume={volume} open={opened} />
          <div className="volume-card">
            <span className="volume-card-numeral">{volume.numeral}</span>
            <h1 id="volume-title" className="volume-card-title">
              {volume.title}
              <small>{volume.subtitle}</small>
            </h1>
            <p className="volume-card-addressee">{volume.addressee}</p>
            <dl className="volume-card-meta">
              <div><dt>日本刊行</dt><dd>{volume.published}</dd></div>
              <div><dt>信件</dt><dd>{volume.chapters.length} 章</dd></div>
              <div><dt>已读</dt><dd>{finished} / {volume.chapters.length}</dd></div>
            </dl>
            {resume && (
              <Link href={chapterHref(volume.id, resume.slug)} className="volume-card-cta">
                {progress.get(resume.slug) ? "继续阅读" : "从头读起"} · {chapterLabel(resume)} <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="volume-contents" aria-labelledby="contents-title">
        <header className="volume-contents-head">
          <h2 id="contents-title">目录 <small>CONTENTS</small></h2>
          <p>{volume.provenance}</p>
        </header>
        <ol className="chapter-list">
          {volume.chapters.map((chapter, index) => {
            const item = progress.get(chapter.slug);
            const state = chapter.pending ? "pending" : item?.finished ? "done" : item ? "reading" : "sealed";
            return (
              <li key={chapter.slug} style={{ "--i": index } as CSSProperties}>
                <Link href={chapterHref(volume.id, chapter.slug)} className="chapter-row" data-state={state} aria-describedby={`chapter-state-${chapter.slug}`}>
                  <span className="chapter-row-seal" aria-hidden="true">
                    <i>{state === "done" ? "✓" : "V"}</i>
                  </span>
                  <span className="chapter-row-number">{chapterLabel(chapter)}</span>
                  <span className="chapter-row-title">
                    <b>{chapter.title}</b>
                    {chapter.note && <small>{chapter.note}</small>}
                  </span>
                  <span className="chapter-row-meta" id={`chapter-state-${chapter.slug}`}>
                    {chapter.pending
                      ? "尚未抄录"
                      : state === "done"
                        ? "已读完"
                        : state === "reading"
                          ? `读到 ${Math.round((item?.ratio ?? 0) * 100)}%`
                          : `约 ${chapter.minutes} 分钟`}
                  </span>
                  <span className="chapter-row-line" aria-hidden="true">
                    <i style={{ "--p": item?.ratio ?? 0 } as CSSProperties} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}
