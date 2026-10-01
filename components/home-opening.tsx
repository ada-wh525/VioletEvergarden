"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildCamera } from "../lib/home-drawing/camera";
import { ART, buildStroke, fracAt, isRetrace, timeAt } from "../lib/home-drawing/path";
import { createRenderer } from "../lib/home-drawing/renderer";

const SESSION_KEY = "violet-home-drawing-v2-viewed";
const DRAWING_TIME = 28000;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const powerOut = (value: number) => 1 - (1 - clamp(value)) ** 3;
const accent = (dawn: number) => {
  const colors = [[47, 214, 162], [10, 143, 102]];
  return `rgb(${colors[0].map((channel, index) => Math.round(channel + (colors[1][index] - channel) * dawn)).join(",")})`;
};

export function HomeOpening() {
  const [visible, setVisible] = useState(true);
  const [arriving, setArriving] = useState(false);
  const finished = useRef(false);
  const releasePage = useRef<(() => void) | null>(null);
  const skipButton = useRef<HTMLButtonElement>(null);
  const art = useRef<HTMLDivElement>(null);
  const drawing = useRef<HTMLDivElement>(null);
  const ink = useRef<HTMLCanvasElement>(null);
  const glow = useRef<HTMLCanvasElement>(null);

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
    if ((!replay && seen) || location.hash || reducedMotion.matches) {
      finish();
      return;
    }
    if (!ink.current?.getContext("2d") || !glow.current?.getContext("2d")) {
      finish();
      return;
    }
    const stroke = buildStroke();
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
    let isArriving = false;
    let progress = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;
    const layout = () => {
      renderer.resize(width, height);
      return buildCamera(stroke, { w: width, h: height, u0: 0, anchor: { x: width * .54, y: height * .45 } });
    };
    let camera = layout();
    let lastTimestamp = 0;
    let retrace = 0;
    let retraceFrom = 0;
    let retraceTarget = 0;
    let retraceStarted = 0;
    const gemTime = timeAt(stroke.gem.doneAt);
    const paint = (value: number, timestamp = lastTimestamp) => {
      const nextRetrace = isRetrace(value) ? 1 : 0;
      if (nextRetrace !== retraceTarget) {
        retraceFrom = retrace;
        retraceTarget = nextRetrace;
        retraceStarted = timestamp;
      }
      retrace = retraceFrom + (retraceTarget - retraceFrom) * powerOut((timestamp - retraceStarted) / 300);
      lastTimestamp = timestamp;
      const cam = camera.at(value);
      // The same frame fields as the original timeline, without its lettering.
      renderer.draw({
        cam, frac: fracAt(value), retrace,
        gem: clamp((value - gemTime) / .012),
        rest: powerOut((value - .965) / .035),
        dot: 3 * cam.k / camera.first.k,
        stop: 5.4,
        accent: accent(clamp((value - .855) / (.985 - .855)) ** 3),
      });
    };

    const resize = () => {
      // The destination may change columns on rotation; reveal the settled page.
      if (isArriving) { finish(); return; }
      width = window.innerWidth;
      height = window.innerHeight;
      camera = layout();
      paint(progress);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish(true);
    };
    const onMotionChange = () => { if (reducedMotion.matches) finish(); };
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", resize);
    reducedMotion.addEventListener?.("change", onMotionChange);
    const fallback = window.setTimeout(() => finish(), DRAWING_TIME + 5000);
    releasePage.current = () => {
      window.cancelAnimationFrame(animationFrame);
      arrival?.cancel();
      window.clearTimeout(fallback);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", resize);
      reducedMotion.removeEventListener?.("change", onMotionChange);
      document.documentElement.classList.remove("home-opening-playing");
      if (!wasInert) page?.removeAttribute("inert");
      document.body.style.overflow = previousOverflow;
    };

    const arrive = () => {
      const destination = document.querySelector<HTMLElement>("#top .hero-visual")?.getBoundingClientRect();
      if (!destination?.width || !destination.height || !art.current?.animate) { finish(); return; }
      isArriving = true;
      const frame = camera.at(1);
      const scale = Math.max(frame.k * 1.3, destination.height * .98 / ART.h);
      const zoom = scale / frame.k;
      const x = destination.left + destination.width / 2 - ART.w / 2 * scale - zoom * (width / 2 - frame.x * frame.k);
      const y = destination.top + destination.height / 2 - ART.h / 2 * scale - zoom * (height / 2 - frame.y * frame.k);
      drawing.current?.style.setProperty("--drawing-end", `matrix(${zoom}, 0, 0, ${zoom}, ${x}, ${y})`);
      arrival = art.current.animate([
        { left: "0px", top: "0px", width: `${width}px`, height: `${height}px` },
        { left: `${destination.left}px`, top: `${destination.top}px`, width: `${destination.width}px`, height: `${destination.height}px` },
      ], { duration: 1200, easing: "cubic-bezier(.22,.68,.15,1)", fill: "forwards" });
      setArriving(true);
    };
    let started: number | null = null;
    const draw = (timestamp: number) => {
      if (finished.current) return;
      started ??= timestamp;
      progress = Math.min(1, Math.max(0, (timestamp - started) / DRAWING_TIME));
      paint(progress, timestamp);
      if (progress < 1) animationFrame = window.requestAnimationFrame(draw);
      else arrive();
    };
    paint(0);
    animationFrame = window.requestAnimationFrame(draw);

    return () => {
      releasePage.current?.();
      releasePage.current = null;
    };
  }, [finish]);

  if (!visible) return null;

  return (
    <div className={`home-opening${arriving ? " is-arriving" : ""}`} role="dialog" aria-modal="true" aria-label="人物绘画入场" onAnimationEnd={(event) => {
      if (event.target === event.currentTarget && event.animationName === "home-opening-exit") finish();
    }}>
      <div className="home-opening__backdrop" aria-hidden="true" />
      <div className="home-opening__art" ref={art} aria-hidden="true">
        <div className="hero-artwork home-opening__color" />
        <div className="hero-shade home-opening__shade" />
      </div>
      <div ref={drawing} className="home-opening__drawing" aria-hidden="true">
        <canvas ref={ink} className="home-opening__ink" />
        <canvas ref={glow} className="home-opening__glow" />
      </div>
      <button ref={skipButton} className="home-opening__skip" type="button" onClick={() => finish(true)}>跳过 <span aria-hidden="true">↗</span></button>
    </div>
  );
}
