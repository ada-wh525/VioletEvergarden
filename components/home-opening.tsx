"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SESSION_KEY = "violet-home-opening-viewed";

export function HomeOpening() {
  const [visible, setVisible] = useState(true);
  const [now, setNow] = useState<Date | null>(null);
  const finished = useRef(false);
  const releasePage = useRef<(() => void) | null>(null);
  const skipButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!visible) return;
    const updateClock = () => setNow(new Date());
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, [visible]);

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
    if ((!replay && seen) || location.hash || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return;
    }
    if (replay) document.documentElement.classList.remove("home-opening-seen");

    const page = document.querySelector("main");
    const wasInert = page?.hasAttribute("inert") ?? false;
    const previousOverflow = document.body.style.overflow;
    page?.setAttribute("inert", "");
    document.body.style.overflow = "hidden";
    skipButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish(true);
    };
    document.addEventListener("keydown", onKeyDown);
    releasePage.current = () => {
      document.removeEventListener("keydown", onKeyDown);
      if (!wasInert) page?.removeAttribute("inert");
      document.body.style.overflow = previousOverflow;
    };

    // Always reveal the page if an animation is interrupted or unsupported.
    const fallback = window.setTimeout(() => finish(), 8200);
    return () => {
      window.clearTimeout(fallback);
      releasePage.current?.();
      releasePage.current = null;
    };
  }, [finish]);

  if (!visible) return null;

  return (
    <div className="home-opening" role="dialog" aria-modal="true" aria-label="启封信件" onAnimationEnd={(event) => {
      if (event.target === event.currentTarget && event.animationName === "home-opening-exit") finish();
    }}>
      <div className="home-opening__light" aria-hidden="true" />
      <div className="home-opening__stationery" aria-hidden="true">
        <div className="home-opening__back" />
        <div className="home-opening__letter-date">
          <span>CH POSTAL</span>
          <time>
            {now ? new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).format(now) : "----年--月--日"}
            <b>{now ? new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(now) : "--:--:--"}</b>
          </time>
        </div>
        <div className="home-opening__paper">
          <span className="home-opening__paper-mark">C. H. POSTAL</span>
          <span className="home-opening__paper-rule" />
          <span className="home-opening__paper-title">Violet<br />Evergarden</span>
          <span className="home-opening__paper-line" />
        </div>
        <div className="home-opening__fold" />
        <div className="home-opening__front" />
        <div className="home-opening__cut-line" />
        <div className="home-opening__stamp">CH</div>
        <div className="home-opening__knife">
          {/* Native image keeps the isolated cutout eager and independently animated. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/antique-letter-opener.webp" alt="" draggable="false" fetchPriority="high" />
        </div>
      </div>
      <div className="home-opening__unfold" aria-hidden="true" />
      <button ref={skipButton} className="home-opening__skip" type="button" onClick={() => finish(true)}>跳过 <span aria-hidden="true">↗</span></button>
    </div>
  );
}
