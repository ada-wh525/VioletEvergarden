"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- this standalone exchange intentionally uses full-page navigation */

import { FormEvent, useRef, useState } from "react";
import { TurnstileWidget } from "../../components/turnstile-widget";

type LetterTheme = "hydrangea" | "ivory" | "wine";

type PublicLetter = {
  id: string;
  addressee: string;
  content: string;
  author: string;
  date: string;
  theme: LetterTheme;
  likes?: number;
};

type ViewMode = "receive" | "send";
type ReadState = "sealed" | "loading" | "open" | "error" | "empty";
type SubmitState = "idle" | "sending" | "success" | "error";

const MAX_LETTER_LENGTH = 600;

function displayLetterNumber(id: string) {
  const archiveNumber = id.match(/^archive-(\d+)$/)?.[1];
  if (archiveNumber) return archiveNumber;

  const compactId = id.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase();
  return compactId || "000001";
}

const THEMES: Array<{ id: LetterTheme; name: string; note: string }> = [
  { id: "hydrangea", name: "绣球花蓝", note: "安静而清澈" },
  { id: "ivory", name: "信笺象牙白", note: "温暖而克制" },
  { id: "wine", name: "缎带酒红", note: "深沉而郑重" },
];

function Brand() {
  return (
    <span className="letters-brand" aria-hidden="true">
      <span className="letters-brand-mark">V</span>
      <span>VIOLET<br />EVERGARDEN</span>
    </span>
  );
}

export default function LettersPage() {
  const [mode, setMode] = useState<ViewMode>("receive");
  const [readState, setReadState] = useState<ReadState>("sealed");
  const [currentLetter, setCurrentLetter] = useState<PublicLetter | null>(null);
  const [reportState, setReportState] = useState<"idle" | "sending" | "done">("idle");
  const [likeState, setLikeState] = useState<"idle" | "sending" | "done">("idle");
  const [signature, setSignature] = useState("");
  const [content, setContent] = useState("");
  const [theme, setTheme] = useState<LetterTheme>("hydrangea");
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitMessage, setSubmitMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileState, setTurnstileState] = useState<"loading" | "ready" | "verified" | "error">("loading");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const letterHeadingRef = useRef<HTMLHeadingElement>(null);

  const switchMode = (nextMode: ViewMode) => {
    setMode(nextMode);
    setSubmitMessage("");
  };

  const openRandomLetter = async () => {
    setReadState("loading");
    setReportState("idle");
    setLikeState("idle");

    try {
      const response = await fetch("/api/random-letter", { headers: { accept: "application/json" } });
      if (response.status === 404) {
        setCurrentLetter(null);
        setReadState("empty");
        return;
      }
      if (!response.ok) throw new Error("信箱暂时无法开启");
      const payload = (await response.json()) as { letter: PublicLetter };
      const nextLetter = payload.letter;

      setCurrentLetter(nextLetter);
      setReadState("open");
      window.requestAnimationFrame(() => letterHeadingRef.current?.focus());
    } catch {
      setReadState("error");
    }
  };

  const likeLetter = async () => {
    if (!currentLetter || likeState !== "idle") return;
    setLikeState("sending");

    try {
      const response = await fetch("/api/like-letter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: currentLetter.id }),
      });
      const payload = (await response.json()) as { likeCount?: number };
      if (!response.ok) throw new Error("喜欢未能提交");
      const likeCount = payload.likeCount ?? currentLetter.likes ?? 0;
      setCurrentLetter((current) => current ? { ...current, likes: likeCount } : current);
      setLikeState("done");
    } catch {
      setLikeState("idle");
    }
  };

  const reportLetter = async () => {
    if (!currentLetter || reportState !== "idle") return;
    setReportState("sending");

    try {
      const response = await fetch("/api/report-letter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: currentLetter.id }),
      });
      if (!response.ok) throw new Error("举报未能提交");
      setReportState("done");
    } catch {
      setReportState("idle");
    }
  };

  const submitLetter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      setSubmitState("error");
      setSubmitMessage("请先写下想要寄出的内容。");
      return;
    }
    if (!privacyConfirmed) {
      setSubmitState("error");
      setSubmitMessage("请确认信中没有电话、邮箱、住址等个人信息。");
      return;
    }
    if (!turnstileToken) {
      setSubmitState("error");
      setSubmitMessage(turnstileState === "error" ? "安全验证暂时不可用，请重新加载验证。" : "请先完成人机验证。");
      return;
    }

    setSubmitState("sending");
    setSubmitMessage("");
    const pendingLetter = {
      author: signature.trim() || "一位未署名的寄信人",
      content: trimmedContent,
      theme,
      turnstileToken,
    };

    try {
      const response = await fetch("/api/submit-letter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(pendingLetter),
      });
      const result = (await response.json()) as { code?: string; error?: string };
      if (!response.ok) {
        if (result.code === "verification_failed") throw new Error("verification_failed");
        if (result.code === "verification_unavailable") throw new Error("verification_unavailable");
        if (response.status === 403) throw new Error("blocked");
        throw new Error("submission_failed");
      }

      setSignature("");
      setContent("");
      setPrivacyConfirmed(false);
      setTurnstileToken(null);
      setSubmitState("success");
      setSubmitMessage("信件已进入审核队列。通过后，它会出现在陌生来信的信池中。");
    } catch (error) {
      const reason = error instanceof Error ? error.message : "submission_failed";
      setTurnstileToken(null);
      setTurnstileResetKey((value) => value + 1);
      setSubmitState("error");
      setSubmitMessage(
        reason === "verification_failed"
          ? "验证已过期，请重新完成验证。"
          : reason === "verification_unavailable"
            ? "安全验证暂时不可用，请稍后再试。"
            : reason === "blocked"
              ? "当前无法继续投递。"
              : "投递没有成功，请稍后再试。",
      );
    }
  };

  return (
    <main className="letters-page">
      <nav className="letters-nav" aria-label="陌生来信导航">
        <a href="/" aria-label="返回薇尔莉特纪念站首页"><Brand /></a>
        <a className="letters-home-link" href="/">返回纪念站 <span>↗</span></a>
      </nav>

      <section className="letters-exchange">
        <div className="letters-intro">
          <p className="letters-kicker">LETTERS BETWEEN STRANGERS</p>
          <h1>今天，有一封信<br /><em>寄到了你这里。</em></h1>
          <p className="letters-lead">不设公开评论和热度排行。每一次只拆开一封信，安静读完另一个人未能说出口的话。</p>

          <div className="letters-mode-switch" role="tablist" aria-label="陌生来信功能">
            <button id="receive-tab" type="button" role="tab" aria-selected={mode === "receive"} aria-controls="receive-panel" onClick={() => switchMode("receive")}>
              <span>01</span> 收一封信
            </button>
            <button id="send-tab" type="button" role="tab" aria-selected={mode === "send"} aria-controls="send-panel" onClick={() => switchMode("send")}>
              <span>02</span> 寄一封信
            </button>
          </div>

          <div className="letters-note">
            <span>投递原则</span>
            <p>信件通过审核后才会进入随机信池。请保护自己，也尊重每一位收信人。</p>
          </div>
        </div>

        <div className="letters-workbench">
          {mode === "receive" ? (
            <div className="receive-panel" id="receive-panel" role="tabpanel" aria-labelledby="receive-tab">
              {readState === "open" && currentLetter ? (
                <article className={`stranger-letter letter-theme-${currentLetter.theme}`}>
                  <div className="stranger-letter-airmail" aria-hidden="true" />
                  <header>
                    <span>LETTER NO. {displayLetterNumber(currentLetter.id)}</span>
                    <time>{currentLetter.date}</time>
                  </header>
                  <h2 ref={letterHeadingRef} tabIndex={-1}>{currentLetter.addressee}</h2>
                  <div className="stranger-letter-body">
                    {currentLetter.content.split(/\n{2,}/).map((paragraph, index) => <p key={`${currentLetter.id}-${index}`}>{paragraph}</p>)}
                  </div>
                  <p className="stranger-letter-sign">{currentLetter.author}</p>
                  <div className="stranger-letter-actions">
                    <button type="button" onClick={() => setReadState("sealed")}>将它好好收起</button>
                    <button className="letter-next" type="button" onClick={() => void openRandomLetter()}>再等一封信 <span>→</span></button>
                  </div>
                  <div className="letter-feedback-actions">
                    <button className="letter-like" type="button" onClick={() => void likeLetter()} disabled={likeState !== "idle"} aria-pressed={likeState === "done"}>
                      <span aria-hidden="true">♡</span>{likeState === "done" ? "已喜欢" : likeState === "sending" ? "正在保存" : "喜欢这封信"}<b>{currentLetter.likes ? currentLetter.likes : ""}</b>
                    </button>
                    <button className="letter-report" type="button" onClick={() => void reportLetter()} disabled={reportState !== "idle"}>
                      {reportState === "done" ? "已收到反馈" : reportState === "sending" ? "正在提交" : "举报不适内容"}
                    </button>
                  </div>
                </article>
              ) : (
                <div className="sealed-mailbox">
                  <div className={`mailbox-envelope ${readState === "loading" ? "is-opening" : ""}`} aria-hidden="true">
                    <span className="envelope-border" />
                    <span className="envelope-flap" />
                    <span className="envelope-seal">V</span>
                  </div>
                  <p className="mailbox-index">POST OFFICE · LEIDENSCHAFTLICH</p>
                  <h2>{readState === "error" ? "信箱暂时被风吹乱了" : readState === "empty" ? "今天的信池已经空了" : "一封没有指定收件人的信"}</h2>
                  <p>{readState === "error" ? "请稍后再来，邮差会重新整理好信件。" : readState === "empty" ? "等新的来信通过审核后，再回来看看。" : "它来自一个与你未曾谋面的人。"}</p>
                  <button className="open-letter-button" type="button" onClick={() => void openRandomLetter()} disabled={readState === "loading"}>
                    <span aria-hidden="true">✉</span>{readState === "loading" ? "正在取信" : readState === "error" ? "重新取信" : "拆开这封信"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="send-panel" id="send-panel" role="tabpanel" aria-labelledby="send-tab">
              {submitState === "success" ? (
                <div className="letter-submitted" role="status" aria-live="polite">
                  <div className="submitted-stamp" aria-hidden="true"><span>V</span></div>
                  <p>LETTER DISPATCHED</p>
                  <h2>信件已送达<br />审核队列。</h2>
                  <span>{submitMessage}</span>
                  <div>
                    <button type="button" onClick={() => { setSubmitState("idle"); setSubmitMessage(""); setTurnstileResetKey((value) => value + 1); }}>返回写信</button>
                    <button type="button" onClick={() => switchMode("receive")}>去收一封信 <b>→</b></button>
                  </div>
                </div>
              ) : (
                <form className={`anonymous-letter-form letter-theme-${theme}`} onSubmit={submitLetter}>
                  <div className="anonymous-form-head">
                    <div><span>ANONYMOUS LETTER</span><h2>把未能说出口的话，写给一个陌生人。</h2></div>
                    <i>CH POSTAL</i>
                  </div>

                  <label className="anonymous-field">
                    <span>署名 <small>选填</small></span>
                    <input maxLength={24} value={signature} onChange={(event) => setSignature(event.target.value)} placeholder="一位未署名的寄信人" />
                  </label>

                  <label className="anonymous-field letter-content-field">
                    <span>正文 <small>{content.length} / {MAX_LETTER_LENGTH}</small></span>
                    <textarea required maxLength={MAX_LETTER_LENGTH} value={content} onChange={(event) => setContent(event.target.value)} placeholder="亲爱的陌生人：&#10;&#10;请从这里开始写……" />
                  </label>

                  <fieldset className="paper-choices">
                    <legend>选择信纸</legend>
                    {THEMES.map((item) => (
                      <label key={item.id} className={`paper-choice choice-${item.id}`}>
                        <input type="radio" name="letter-theme" value={item.id} checked={theme === item.id} onChange={() => setTheme(item.id)} />
                        <span aria-hidden="true" />
                        <b>{item.name}</b>
                        <small>{item.note}</small>
                      </label>
                    ))}
                  </fieldset>

                  <label className="privacy-check">
                    <input type="checkbox" checked={privacyConfirmed} onChange={(event) => setPrivacyConfirmed(event.target.checked)} />
                    <span>我确认信中没有电话、邮箱、住址等个人信息，也愿意让审核通过后的内容被陌生人随机读到。</span>
                  </label>

                  <TurnstileWidget key={turnstileResetKey} onToken={setTurnstileToken} onStateChange={setTurnstileState} />

                  <div className="anonymous-form-footer">
                    <button type="submit" disabled={submitState === "sending" || turnstileState !== "verified"}><span>✉</span>{submitState === "sending" ? "正在投递" : turnstileState === "verified" ? "寄往莱顿" : "等待安全验证"}</button>
                    <p className={submitState === "error" ? "is-error" : ""} role="status" aria-live="polite">{submitMessage || "所有来信都将在审核后进入随机信池。"}</p>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </section>

      <footer className="letters-footer">
        <span>LETTERS FROM THE HEART · FAN MADE PROJECT</span>
        <div><a href="/contact">联系作者</a><a href="/">返回纪念站</a></div>
      </footer>
    </main>
  );
}
