"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SESSION_KEY = "violet-home-opening-viewed";

export function HomeOpening() {
  const [visible, setVisible] = useState(true);
  const finished = useRef(false);
  const releasePage = useRef<(() => void) | null>(null);
  const skipButton = useRef<HTMLButtonElement>(null);

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
    const fallback = window.setTimeout(() => finish(), 3200);
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
        <div className="home-opening__paper">
          <span className="home-opening__paper-mark">C. H. POSTAL</span>
          <span className="home-opening__paper-rule" />
          <span className="home-opening__paper-title">Violet<br />Evergarden</span>
          <span className="home-opening__paper-line" />
        </div>
        <div className="home-opening__fold" />
        <div className="home-opening__front" />
        <div className="home-opening__stamp">V</div>
      </div>
      <div className="home-opening__unfold" aria-hidden="true" />
      <button ref={skipButton} className="home-opening__skip" type="button" onClick={() => finish(true)}>跳过 <span aria-hidden="true">↗</span></button>
    </div>
  );
}
