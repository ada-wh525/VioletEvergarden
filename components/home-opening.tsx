"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createDrawingCamera } from "../lib/violet-drawing";
import { VIOLET_GEM, VIOLET_OUTLINE } from "../lib/violet-outline";

const SESSION_KEY = "violet-home-drawing-viewed";
const DRAWING_TIME = 4200;

export function HomeOpening() {
  const [visible, setVisible] = useState(true);
  const [arriving, setArriving] = useState(false);
  const finished = useRef(false);
  const releasePage = useRef<(() => void) | null>(null);
  const skipButton = useRef<HTMLButtonElement>(null);
  const art = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const cameraGroup = useRef<SVGGElement>(null);
  const outline = useRef<SVGPathElement>(null);
  const freshInk = useRef<SVGPathElement>(null);
  const pen = useRef<SVGCircleElement>(null);
  const gem = useRef<SVGPathElement>(null);

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
    const camera = createDrawingCamera();
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
    const paint = (value: number) => {
      svg.current?.setAttribute("viewBox", `0 0 ${width} ${height}`);
      const frame = camera.frame(value, width, height);
      cameraGroup.current?.setAttribute("transform", `translate(${width / 2} ${height / 2}) scale(${frame.scale}) translate(${-frame.x} ${-frame.y})`);
      outline.current?.setAttribute("stroke-dashoffset", String(1 - frame.fraction));
      outline.current?.setAttribute("stroke-width", String(frame.lineWidth));
      freshInk.current?.setAttribute("stroke-dasharray", `${frame.tail} 2`);
      freshInk.current?.setAttribute("stroke-dashoffset", String(frame.tail - frame.fraction));
      freshInk.current?.setAttribute("stroke-width", String(frame.lineWidth));
      freshInk.current?.setAttribute("opacity", value > 0 && value < 1 ? "1" : "0");
      pen.current?.setAttribute("cx", String(frame.pen.x));
      pen.current?.setAttribute("cy", String(frame.pen.y));
      pen.current?.setAttribute("r", String(3.5 / frame.scale));
      pen.current?.setAttribute("opacity", value < 1 ? "1" : "0");
      gem.current?.setAttribute("opacity", String(frame.gemOpacity));
    };

    const resize = () => {
      // The destination may change columns on rotation; reveal the settled page.
      if (isArriving) { finish(); return; }
      width = window.innerWidth;
      height = window.innerHeight;
      paint(progress);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish(true);
    };
    const onMotionChange = () => { if (reducedMotion.matches) finish(); };
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", resize);
    reducedMotion.addEventListener?.("change", onMotionChange);
    const fallback = window.setTimeout(() => finish(), 7500);
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
      const frame = camera.frame(1, width, height);
      const scale = Math.max(frame.scale * 1.3, destination.height * .98 / 1448);
      cameraGroup.current?.style.setProperty("--drawing-start", `matrix(${frame.scale}, 0, 0, ${frame.scale}, ${width / 2 - frame.x * frame.scale}, ${height / 2 - frame.y * frame.scale})`);
      cameraGroup.current?.style.setProperty("--drawing-end", `matrix(${scale}, 0, 0, ${scale}, ${destination.left + destination.width / 2 - 543 * scale}, ${destination.top + destination.height / 2 - 724 * scale})`);
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
      paint(progress);
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
      <svg ref={svg} className="home-opening__drawing" viewBox="0 0 1440 900" aria-hidden="true">
        <g ref={cameraGroup} className="home-opening__camera">
          <path ref={gem} d={VIOLET_GEM} className="home-opening__gem" opacity="0" />
          <path ref={outline} d={VIOLET_OUTLINE} className="home-opening__line" pathLength="1" strokeDasharray="1" strokeDashoffset="1" vectorEffect="non-scaling-stroke" />
          <path ref={freshInk} d={VIOLET_OUTLINE} className="home-opening__line home-opening__fresh-ink" pathLength="1" vectorEffect="non-scaling-stroke" opacity="0" />
          <circle ref={pen} className="home-opening__pen" opacity="0" />
        </g>
      </svg>
      <button ref={skipButton} className="home-opening__skip" type="button" onClick={() => finish(true)}>跳过 <span aria-hidden="true">↗</span></button>
    </div>
  );
}
