import Link from "next/link";
import type { ReactNode } from "react";

export function ReadBrand() {
  return (
    <Link className="read-brand" href="/read" aria-label="原著书信 · 信匣">
      <span className="read-brand-mark" aria-hidden="true">V</span>
      <span className="read-brand-text">
        <b>C.H. POSTAL</b>
        <small>原著书信</small>
      </span>
    </Link>
  );
}

export function ReadNav({ back, children }: { back?: { href: string; label: string }; children?: ReactNode }) {
  return (
    <nav className="read-nav" aria-label="阅读导航">
      <ReadBrand />
      <div className="read-nav-side">
        {children}
        {back ? (
          <Link className="read-nav-link" href={back.href}>
            <span aria-hidden="true">←</span> {back.label}
          </Link>
        ) : (
          /* eslint-disable-next-line @next/next/no-html-link-for-pages -- leaves the reader for the full homepage */
          <a className="read-nav-link" href="/">返回纪念站 <span aria-hidden="true">↗</span></a>
        )}
      </div>
    </nav>
  );
}

export function ReadFooter() {
  return (
    <footer className="read-footer">
      <p>LETTERS FROM THE HEART · 原著书信为非官方同人译本，版权归原作者与出版方所有。</p>
      <div>
        <Link href="/read">信匣</Link>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full-page link back to the homepage */}
        <a href="/">纪念站</a>
        <a href="/contact">联系作者</a>
      </div>
    </footer>
  );
}
