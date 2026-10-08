import { LetterCase } from "../../components/read/letter-case";
import { ReadFooter, ReadNav } from "../../components/read/read-frame";
import { VOLUMES } from "../../lib/novel";
import "./read.css";

export default function ReadIndexPage() {
  const total = VOLUMES.reduce((sum, volume) => sum + volume.chapters.length, 0);
  const pending = VOLUMES.reduce((sum, volume) => sum + volume.pendingChapters, 0);

  return (
    <div className="read-page read-case" data-theme="prussian">
      <ReadNav />
      <main className="case-main">
        <header className="case-hero">
          <p className="read-kicker">THE ORIGINAL LETTERS · 原著书信</p>
          <h1 className="case-title">
            每一卷，<em>都是一封尚未拆开的信。</em>
          </h1>
          <p className="case-lead">
            四封信按寄出的年份叠在桌上。拆开一封，便翻到那一卷的目录；读到哪里，信匣都会替你记着。
          </p>
          <p className="case-stats">
            <span>{VOLUMES.length} 卷</span>
            <span>{total} 章</span>
            {pending > 0 && <span className="is-pending">{pending} 章待抄录</span>}
          </p>
        </header>

        <section className="case-desk" aria-labelledby="case-desk-title">
          <h2 id="case-desk-title" className="visually-hidden">选择一卷</h2>
          <LetterCase volumes={VOLUMES} />
          <p className="case-desk-hint">轻触信封，拆开它。</p>
        </section>
      </main>
      <ReadFooter />
    </div>
  );
}
