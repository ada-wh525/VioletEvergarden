"use client";

import Link from "next/link";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { chapterHref, chapterLabel, volumeHref, type Chapter, type ChapterBlock, type LetterBlock, type Volume } from "../../lib/novel";
import { DEFAULT_SETTINGS, loadProgress, loadSettings, type ReadSettings, saveProgress, saveSettings } from "../../lib/novel/progress";

type Props = {
  volume: Volume;
  chapter: Chapter;
  previous?: Chapter;
  next?: Chapter;
  nextVolume?: Volume;
};

const SIZE_LABELS: Record<ReadSettings["size"], string> = { s: "小", m: "中", l: "大" };
const LEADING_LABELS: Record<ReadSettings["leading"], string> = { tight: "紧", normal: "适中", loose: "疏" };
const THEME_LABELS: Record<ReadSettings["theme"], string> = { ivory: "象牙白", lamp: "夜灯", prussian: "普鲁士蓝" };

function InkLetter({ block, index }: { block: LetterBlock; index: number }) {
  const [flat, setFlat] = useState(false);
  return (
    <figure className={`ink-letter ${flat ? "is-flat" : ""}`} data-paragraph={index}>
      <div className="ink-letter-sheet">
        {block.salutation && <p className="ink-letter-salutation">{block.salutation}</p>}
        {block.paragraphs.map((text, i) => (
          <p key={i}>{text}</p>
        ))}
        {block.signature && <p className="ink-letter-signature">{block.signature}</p>}
      </div>
      <button type="button" className="ink-letter-toggle" onClick={() => setFlat((value) => !value)} aria-pressed={flat}>
        {flat ? "折起这封信" : "摊平这封信"}
      </button>
    </figure>
  );
}

function Block({ block, index }: { block: ChapterBlock; index: number }) {
  if (block.kind === "break") return <hr className="ink-break" data-paragraph={index} />;
  if (block.kind === "letter") return <InkLetter block={block} index={index} />;
  return (
    <p data-paragraph={index}>
      {block.text.split("\n").map((line, i, arr) => (
        <span key={i}>
          {line}
          {i < arr.length - 1 && <br />}
        </span>
      ))}
    </p>
  );
}

export function ChapterReader({ volume, chapter, previous, next, nextVolume }: Props) {
  const articleRef = useRef<HTMLElement>(null);
  const [settings, setSettings] = useState<ReadSettings>(DEFAULT_SETTINGS);
  const [panelOpen, setPanelOpen] = useState(false);
  const [restored, setRestored] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [clip, setClip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);

  const label = chapterLabel(chapter);
  const numeral = chapter.ordinal ? String(chapter.ordinal) : "S";
  const nextHref = next ? chapterHref(volume.id, next.slug) : nextVolume ? volumeHref(nextVolume.id) : volumeHref(volume.id);
  const prevHref = previous ? chapterHref(volume.id, previous.slug) : volumeHref(volume.id);

  // Settings
  useEffect(() => {
    const frame = requestAnimationFrame(() => setSettings(loadSettings()));
    return () => cancelAnimationFrame(frame);
  }, []);
  const updateSettings = useCallback((patch: Partial<ReadSettings>) => {
    setSettings((current) => {
      const nextSettings = { ...current, ...patch };
      saveSettings(nextSettings);
      return nextSettings;
    });
  }, []);

  // Restore paragraph position
  useEffect(() => {
    if (chapter.pending) return;
    const saved = loadProgress(volume.id, chapter.slug);
    if (!saved || saved.finished || saved.paragraph < 1) return;
    const target = articleRef.current?.querySelector<HTMLElement>(`[data-paragraph="${saved.paragraph}"]`);
    if (!target) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => {
      target.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
      setRestored(saved.paragraph);
      window.setTimeout(() => setRestored(null), 2600);
    });
  }, [volume.id, chapter.slug, chapter.pending]);

  // Progress: route line + paragraph memory
  useEffect(() => {
    if (chapter.pending) return;
    const article = articleRef.current;
    if (!article) return;
    let ticking = false;
    let lastSavedParagraph = -1;
    let lastSaveAt = 0;
    const paragraphs = Array.from(article.querySelectorAll<HTMLElement>("[data-paragraph]"));

    const measure = () => {
      ticking = false;
      const rect = article.getBoundingClientRect();
      const viewport = window.innerHeight;
      const total = rect.height - viewport * 0.4;
      const ratio = total <= 0 ? 1 : Math.min(1, Math.max(0, (viewport * 0.6 - rect.top) / total));
      setProgress(ratio);

      const line = viewport * 0.45;
      let current = 0;
      for (const node of paragraphs) {
        if (node.getBoundingClientRect().top <= line) current = Number(node.dataset.paragraph);
        else break;
      }
      const finished = ratio >= 0.985;
      const now = Date.now();
      if (current !== lastSavedParagraph || finished || now - lastSaveAt > 4000) {
        lastSavedParagraph = current;
        lastSaveAt = now;
        saveProgress(volume.id, chapter.slug, { paragraph: current, ratio, finished });
      }
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(measure);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [volume.id, chapter.slug, chapter.pending]);

  // Keyboard: ← → between chapters, Esc closes panel
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.key === "Escape") setPanelOpen(false);
      if (event.key === "ArrowRight" && !event.metaKey && !event.altKey) window.location.assign(nextHref);
      if (event.key === "ArrowLeft" && !event.metaKey && !event.altKey) window.location.assign(prevHref);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nextHref, prevHref]);

  // Quote clipping
  useEffect(() => {
    const onSelection = () => {
      const selection = document.getSelection();
      const article = articleRef.current;
      if (!selection || selection.isCollapsed || !article || selection.rangeCount === 0) {
        setClip(null);
        return;
      }
      const range = selection.getRangeAt(0);
      if (!article.contains(range.commonAncestorContainer)) {
        setClip(null);
        return;
      }
      const text = selection.toString().trim();
      if (text.length < 2 || text.length > 300) {
        setClip(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      setClip({ x: rect.left + rect.width / 2, y: rect.top + window.scrollY, text });
    };
    document.addEventListener("selectionchange", onSelection);
    return () => document.removeEventListener("selectionchange", onSelection);
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2200);
  }, []);

  const copyClip = useCallback(async () => {
    if (!clip) return;
    const attribution = `——《${volume.title}》${volume.subtitle} · ${label} ${chapter.title}`;
    try {
      await navigator.clipboard.writeText(`「${clip.text}」\n${attribution}`);
      showToast("已抄录到剪贴板");
    } catch {
      showToast("浏览器不允许自动抄录");
    }
    document.getSelection()?.removeAllRanges();
    setClip(null);
  }, [clip, volume, label, chapter.title, showToast]);

  const routeStyle = useMemo(() => ({ "--route": progress } as CSSProperties), [progress]);

  return (
    <div className="reader" data-size={settings.size} data-leading={settings.leading} data-theme={settings.theme}>
      <div className="post-route" style={routeStyle} aria-hidden="true">
        <span className="post-route-from">莱顿</span>
        <i className="post-route-line" />
        <span className="post-route-envelope" />
        <span className="post-route-to">{next ? chapterLabel(next) : "卷末"}</span>
      </div>

      <nav className="reader-nav" aria-label="章节导航">
        <Link href={volumeHref(volume.id)} className="reader-nav-back">
          <span aria-hidden="true">←</span>
          <span className="reader-nav-volume">{volume.numeral} · {volume.subtitle}</span>
        </Link>
        <span className="reader-nav-title">{label} {chapter.title}</span>
        <div className="reader-nav-tools">
          <button type="button" className="reader-tool" aria-expanded={panelOpen} aria-controls="read-settings" onClick={() => setPanelOpen((value) => !value)}>
            <span aria-hidden="true" className="reader-tool-glyph">Aa</span>
            排字
          </button>
          <Link href="/read" className="reader-tool">信匣</Link>
        </div>
      </nav>

      <div id="read-settings" className={`reader-panel ${panelOpen ? "is-open" : ""}`} hidden={!panelOpen}>
        <fieldset>
          <legend>字号</legend>
          {(Object.keys(SIZE_LABELS) as ReadSettings["size"][]).map((size) => (
            <button key={size} type="button" aria-pressed={settings.size === size} onClick={() => updateSettings({ size })}>{SIZE_LABELS[size]}</button>
          ))}
        </fieldset>
        <fieldset>
          <legend>行距</legend>
          {(Object.keys(LEADING_LABELS) as ReadSettings["leading"][]).map((leading) => (
            <button key={leading} type="button" aria-pressed={settings.leading === leading} onClick={() => updateSettings({ leading })}>{LEADING_LABELS[leading]}</button>
          ))}
        </fieldset>
        <fieldset>
          <legend>信纸</legend>
          {(Object.keys(THEME_LABELS) as ReadSettings["theme"][]).map((theme) => (
            <button key={theme} type="button" aria-pressed={settings.theme === theme} data-theme-swatch={theme} onClick={() => updateSettings({ theme })}>
              <i aria-hidden="true" />{THEME_LABELS[theme]}
            </button>
          ))}
        </fieldset>
      </div>

      <main className="reader-main">
        <header className="reader-head">
          <span className="reader-postmark" aria-hidden="true">
            <span>{volume.published}</span>
            <b>{numeral}</b>
            <em>LEIDEN</em>
          </span>
          <p className="reader-head-kicker">{volume.title} · {volume.subtitle}</p>
          <h1>
            <small>{label}</small>
            {chapter.title}
          </h1>
          {chapter.note && <p className="reader-head-note">{chapter.note}</p>}
          {!chapter.pending && <p className="reader-head-meta">约 {chapter.minutes} 分钟 · {chapter.characters.toLocaleString("zh-CN")} 字</p>}
        </header>

        {chapter.pending ? (
          <section className="reader-pending" aria-labelledby="pending-title">
            <span className="reader-pending-seal" aria-hidden="true">V</span>
            <h2 id="pending-title">这封信还封着。</h2>
            <p>译文尚未放入。站主会在确认授权后，把这一章抄录进来。</p>
            <Link href={volumeHref(volume.id)} className="reader-pending-link">回到目录 <span aria-hidden="true">→</span></Link>
          </section>
        ) : (
          <article ref={articleRef} className="reader-body" lang="zh-CN">
            {chapter.blocks.map((block, index) => (
              <div key={index} className={`reader-block ${restored === index ? "is-restored" : ""}`}>
                <Block block={block} index={index} />
              </div>
            ))}
          </article>
        )}

        <footer className="reader-end">
          <span className="reader-end-rule" aria-hidden="true"><i /><b>✦</b><i /></span>
          {next ? (
            <Link href={nextHref} className="next-letter">
              <span className="next-letter-env" aria-hidden="true"><i /><b>V</b></span>
              <span className="next-letter-copy">
                <small>下一封</small>
                <b>{chapterLabel(next)} · {next.title}</b>
                <em>{next.pending ? "尚未抄录" : `约 ${next.minutes} 分钟`}</em>
              </span>
              <span className="next-letter-arrow" aria-hidden="true">→</span>
            </Link>
          ) : nextVolume ? (
            <Link href={nextHref} className="next-letter is-volume">
              <span className="next-letter-env" aria-hidden="true"><i /><b>{nextVolume.numeral}</b></span>
              <span className="next-letter-copy">
                <small>这一卷读完了 · 下一卷</small>
                <b>{nextVolume.title} {nextVolume.subtitle}</b>
                <em>{nextVolume.addressee}</em>
              </span>
              <span className="next-letter-arrow" aria-hidden="true">→</span>
            </Link>
          ) : (
            <Link href="/read" className="next-letter is-volume">
              <span className="next-letter-env" aria-hidden="true"><i /><b>V</b></span>
              <span className="next-letter-copy">
                <small>全部读完了</small>
                <b>回到信匣</b>
              </span>
              <span className="next-letter-arrow" aria-hidden="true">→</span>
            </Link>
          )}
          <div className="reader-end-links">
            {previous && <Link href={prevHref}>← 上一章</Link>}
            <Link href={volumeHref(volume.id)}>目录</Link>
          </div>
          <p className="reader-end-hint">键盘 ← → 可以翻信</p>
        </footer>
      </main>

      {clip && (
        <button type="button" className="clip-pill" style={{ left: clip.x, top: clip.y }} onMouseDown={(event) => event.preventDefault()} onClick={copyClip}>
          抄录这一句
        </button>
      )}
      <div className={`reader-toast ${toast ? "is-visible" : ""}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}
