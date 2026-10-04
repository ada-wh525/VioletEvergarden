"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { buildCamera } from "../lib/home-drawing/camera";
import { ART, buildStroke, fracAt, isRetrace, timeAt } from "../lib/home-drawing/path";
import { createRenderer } from "../lib/home-drawing/renderer";
import { pickSpots } from "../lib/home-drawing/spots";
import { portraitBox } from "../lib/home-drawing/portrait";
import { RELEASES } from "../lib/home-drawing/releases";

const SESSION_KEY = "violet-home-drawing-v3-viewed";
const INTRO_TIME = 2150;
const DRAWING_TIME = 28000;
const ARRIVAL_TIME = 2400;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const powerOut = (value: number) => 1 - (1 - clamp(value)) ** 3;
const powerInOut = (value: number) => {
  const t = clamp(value);
  return t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
};
const accent = (dawn: number) => {
  const colors = [[47, 214, 162], [10, 143, 102]];
  return `rgb(${colors[0].map((channel, index) => Math.round(channel + (colors[1][index] - channel) * dawn)).join(",")})`;
};

export function HomeOpening() {
  const [visible, setVisible] = useState(true);
  const [arriving, setArriving] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const finished = useRef(false);
  const releasePage = useRef<(() => void) | null>(null);
  const skipButton = useRef<HTMLButtonElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLParagraphElement>(null);
  const art = useRef<HTMLDivElement>(null);
  const ink = useRef<HTMLCanvasElement>(null);
  const glow = useRef<HTMLCanvasElement>(null);
  const cards = useRef<Array<HTMLElement | null>>([]);

  const finish = useCallback((focusHeading = false) => {
    if (finished.current) return;
    finished.current = true;
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* Storage is optional. */ }
    document.documentElement.classList.add("home-opening-seen");
    releasePage.current?.();
    releasePage.current = null;
    setVisible(false);
    if (focusHeading) requestAnimationFrame(() => document.querySelector<HTMLElement>("#top h1")?.focus());
  }, []);

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(SESSION_KEY) === "1"; } catch { /* Storage is optional. */ }
    const replay = new URLSearchParams(location.search).get("opening") === "1";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if ((!replay && seen) || location.hash || reducedMotion.matches) { finish(); return; }
    if (!ink.current?.getContext("2d") || !glow.current?.getContext("2d")) { finish(); return; }

    // Original path, renderer, camera and empty-space placement are kept intact.
    const stroke = buildStroke();
    const u0 = timeAt(512 / stroke.length);
    const penTime = (t: number) => u0 + (1 - u0) * t;
    const renderer = createRenderer(ink.current, glow.current, stroke);
    document.documentElement.classList.remove("home-opening-seen");
    document.documentElement.classList.add("home-opening-playing");
    const page = document.querySelector("main");
    const wasInert = page?.hasAttribute("inert") ?? false;
    const previousOverflow = document.body.style.overflow;
    page?.setAttribute("inert", "");
    document.body.style.overflow = "hidden";
    skipButton.current?.focus();

    let animationFrame = 0;
    let arrival: Animation | null = null;
    let arrivalTimeout: number | undefined;
    let isArriving = false;
    let elapsed = 0;
    let previous: number | null = null;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let anchor = { x: 0, y: 0 };
    const layout = () => {
      renderer.resize(width, height);
      anchor = { x: width * .38, y: height * .64 };
      const camera = buildCamera(stroke, { w: width, h: height, u0, anchor });
      const spots = pickSpots(RELEASES, stroke, { w: width, h: height, penTime, camera: camera.at });
      spots.forEach((spot, i) => {
        const card = cards.current[i];
        if (card) { card.dataset.x = spot.x; card.dataset.y = spot.y; }
      });
      return camera;
    };
    let camera = layout();
    let retrace = 0;
    let retraceFrom = 0;
    let retraceTarget = 0;
    let retraceStarted = 0;
    const gemTime = timeAt(stroke.gem.doneAt);
    const paint = () => {
      const t = clamp((elapsed - INTRO_TIME) / DRAWING_TIME);
      const u = penTime(t) * powerInOut((elapsed - 150) / 2000);
      const nextRetrace = isRetrace(u) ? 1 : 0;
      if (nextRetrace !== retraceTarget) {
        retraceFrom = retrace;
        retraceTarget = nextRetrace;
        retraceStarted = elapsed;
      }
      retrace = retraceFrom + (retraceTarget - retraceFrom) * powerOut((elapsed - retraceStarted) / 300);
      const cam = camera.at(u);
      const dawn = clamp((u - .855) / (.985 - .855)) ** 3;
      renderer.draw({
        cam, frac: fracAt(u), retrace,
        gem: clamp((u - gemTime) / (.012 * (1 - u0))),
        rest: powerOut((t - .965) / .035),
        dot: 3 * cam.k / camera.first.k, stop: 5.4, accent: accent(dawn),
      });
      // Original dawn: paper opens outward from the emerald brooch.
      if (paper.current) {
        const g = renderer.place(cam, stroke.gem.x, stroke.gem.y);
        const far = Math.hypot(Math.max(g.x, width - g.x), Math.max(g.y, height - g.y)) + 2;
        paper.current.style.clipPath = `circle(${dawn * far}px at ${g.x}px ${g.y}px)`;
      }
      if (title.current) {
        const start = renderer.place(cam, stroke.start.x, stroke.start.y);
        title.current.style.transformOrigin = `${anchor.x}px ${anchor.y - height * .56}px`;
        title.current.style.transform = `translate(${start.x - anchor.x}px, ${start.y - anchor.y}px) scale(${cam.k / camera.first.k})`;
        title.current.style.opacity = `${powerOut(elapsed / 1400) * clamp((.07 - t) / .03)}`;
      }
      RELEASES.forEach((release, i) => {
        const card = cards.current[i];
        if (!card) return;
        const span = release.to - release.from;
        const enter = powerOut((t - release.from) / (span * .22));
        const leave = clamp((t - release.to + span * .14) / (span * .14));
        const opacity = enter * (1 - leave);
        card.style.opacity = `${opacity}`;
        card.style.transform = `translateY(${(1 - enter) * 24 - leave * 16}px)`;
        card.style.visibility = opacity > 0 ? "visible" : "hidden";
        card.setAttribute("aria-hidden", opacity > .5 ? "false" : "true");
      });
      return t;
    };
    const resize = () => {
      if (isArriving) { finish(); return; }
      width = window.innerWidth; height = window.innerHeight;
      camera = layout(); paint();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish(true);
      if (event.key === "Tab" && !event.altKey && !event.ctrlKey && !event.metaKey) {
        const buttons = stage.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])");
        if (!buttons?.length) return;
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    const onMotionChange = () => { if (reducedMotion.matches) finish(); };
    const onVisibilityChange = () => { previous = null; };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("resize", resize);
    reducedMotion.addEventListener?.("change", onMotionChange);
    releasePage.current = () => {
      window.cancelAnimationFrame(animationFrame);
      arrival?.cancel();
      window.clearTimeout(arrivalTimeout);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("resize", resize);
      reducedMotion.removeEventListener?.("change", onMotionChange);
      document.documentElement.classList.remove("home-opening-playing", "home-opening-arriving");
      if (!wasInert) page?.removeAttribute("inert");
      document.body.style.overflow = previousOverflow;
    };

    const arrive = () => {
      const frameRect = document.querySelector<HTMLElement>("#top .hero-portrait-frame")?.getBoundingClientRect();
      if (!frameRect?.width || !frameRect.height || !art.current?.animate) { finish(); return; }
      isArriving = true;
      document.documentElement.classList.add("home-opening-arriving");
      const destination = portraitBox(frameRect);
      const cam = camera.at(1);
      const origin = renderer.place(cam, 0, 0);
      const zoom = destination.scale / cam.k;
      stage.current?.style.setProperty("--drawing-end", `matrix(${zoom}, 0, 0, ${zoom}, ${destination.left - zoom * origin.x}, ${destination.top - zoom * origin.y})`);
      // The colored portrait and the line art use the same artboard, crop and transform.
      arrival = art.current.animate([
        { left: `${origin.x}px`, top: `${origin.y}px`, width: `${ART.w * cam.k}px`, height: `${ART.h * cam.k}px` },
        { left: `${destination.left}px`, top: `${destination.top}px`, width: `${destination.width}px`, height: `${destination.height}px` },
      ], { duration: ARRIVAL_TIME, easing: "cubic-bezier(.22,.68,.15,1)", fill: "forwards" });
      setArriving(true);
      arrivalTimeout = window.setTimeout(() => finish(), ARRIVAL_TIME + 100);
    };
    const draw = (timestamp: number) => {
      if (finished.current) return;
      const delta = previous === null ? 0 : timestamp - previous;
      previous = timestamp;
      if (!pausedRef.current && !document.hidden) elapsed += delta;
      if (paint() < 1) animationFrame = window.requestAnimationFrame(draw);
      else arrive();
    };
    paint();
    animationFrame = window.requestAnimationFrame(draw);
    return () => { releasePage.current?.(); releasePage.current = null; };
  }, [finish]);

  if (!visible) return null;
  return (
    <div ref={stage} className={`home-opening${arriving ? " is-arriving" : ""}`} style={{ "--opening-arrival-duration": `${ARRIVAL_TIME}ms` } as CSSProperties} role="dialog" aria-modal="true" aria-label="人物绘画入场" onAnimationEnd={(event) => {
      if (event.target === event.currentTarget && event.animationName === "home-opening-exit") finish();
    }}>
      <div className="home-opening__backdrop" aria-hidden="true"><div ref={paper} className="home-opening__paper" /></div>
      <div className="home-opening__art" ref={art} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/violet-portrait.webp" alt="" width={1086} height={1448} />
      </div>
      <div className="home-opening__drawing home-opening__drawing--ink" aria-hidden="true"><canvas ref={ink} className="home-opening__ink" /></div>
      <div className="home-opening__drawing" aria-hidden="true"><canvas ref={glow} className="home-opening__glow" /></div>
      <p ref={title} className="home-opening__title" aria-hidden="true">紫罗兰<br />永恒花园</p>
      {RELEASES.map((release, i) => (
        <article className="home-opening__release" key={release.date} ref={(element) => { cards.current[i] = element; }} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={release.image} alt={`${release.title}官方封面`} width={160} height={224} />
          <div><p className="home-opening__kind">{release.kind}</p><h2>{release.title}</h2><p className="home-opening__date"><time dateTime={release.date}>{release.date.replaceAll("-", ".")}</time><span>{release.label}</span></p><p className="home-opening__detail">{release.detail}</p></div>
        </article>
      ))}
      <div className="home-opening__controls">
        <button className="home-opening__pause" type="button" disabled={arriving} aria-pressed={paused} onClick={() => { pausedRef.current = !pausedRef.current; setPaused(pausedRef.current); }}>{paused ? "继续" : "暂停"}</button>
        <button ref={skipButton} className="home-opening__skip" type="button" onClick={() => finish(true)}>跳过 <span aria-hidden="true">↗</span></button>
      </div>
    </div>
  );
}
