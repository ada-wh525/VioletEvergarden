"use client";

import { type FormEvent, useState } from "react";

type SubmitState = "idle" | "sending" | "success" | "error";

export default function ContactPage() {
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [feedback, setFeedback] = useState("");

  const submitLetter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitState("sending");
    setFeedback("");

    try {
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { success?: boolean; message?: string };

      if (!response.ok || !result.success) throw new Error(result.message ?? "邮件投递失败");
      form.reset();
      setSubmitState("success");
      setFeedback("来信已送达，谢谢你穿过这片花园找到我。");
    } catch {
      setSubmitState("error");
      setFeedback("信件暂时未能送达，请稍后再试或直接使用邮箱联系。");
    }
  };

  return (
    <main className="contact-page">
      <header className="contact-nav">
        <a className="brand" href="/" aria-label="返回薇尔莉特纪念站">
          <span className="brand-mark">V</span>
          <span className="brand-name">LETTERS<br />FROM THE HEART</span>
        </a>
        <a className="contact-back" href="/">← 返回花园</a>
      </header>

      <section className="contact-stage">
        <div className="contact-copy">
          <p className="section-kicker">THE HIDDEN CORNER · 01</p>
          <h1>写给作者的，<br /><em>一封短笺。</em></h1>
          <p className="contact-intro">如果你发现了页面里的小问题，或只是想聊聊薇尔莉特与那些没有寄出的信，都可以从这里找到我。</p>
          <div className="direct-mail">
            <span>DIRECT MAIL</span>
            <a href="mailto:550677115@qq.com">550677115@qq.com ↗</a>
          </div>
        </div>

        <div className="contact-letter-wrap">
          <form className="contact-letter" onSubmit={submitLetter}>
            <input type="hidden" name="access_key" value="d910517b-6a8b-4db7-a588-8f89410a6bce" />
            <input type="hidden" name="subject" value="New message from Violet Evergarden fan site" />
            <input type="hidden" name="from_name" value="Violet Evergarden Fan Site" />
            <input className="contact-botcheck" type="checkbox" name="botcheck" tabIndex={-1} autoComplete="off" />

            <div className="contact-letter-head">
              <span>TO · WENZHI HU</span>
              <i>PRIVATE LETTER</i>
            </div>

            <label>
              <span>你的名字</span>
              <input type="text" name="name" required maxLength={60} placeholder="如何称呼你" />
            </label>
            <label>
              <span>回复邮箱</span>
              <input type="email" name="email" required maxLength={120} placeholder="name@example.com" />
            </label>
            <label>
              <span>来信主题</span>
              <input type="text" name="topic" required maxLength={100} placeholder="关于这个小站……" />
            </label>
            <label>
              <span>信件正文</span>
              <textarea name="message" required rows={7} maxLength={2000} placeholder="在这里写下想说的话" />
            </label>

            <button className="contact-submit" type="submit" disabled={submitState === "sending"}>
              <span aria-hidden="true">✦</span>
              {submitState === "sending" ? "正在投递……" : "寄给作者"}
            </button>
            <p className={`contact-feedback ${submitState}`} role="status" aria-live="polite">{feedback}</p>
            <small>邮件由 Web3Forms 转交至作者邮箱。</small>
          </form>
          <div className="contact-postmark" aria-hidden="true"><b>V</b><span>SEP · 2026<br />LEIDEN</span></div>
        </div>
      </section>

      <footer className="contact-footer">
        <span>THE END OF THE GARDEN</span>
        <a href="https://ada-wh525.github.io" target="_blank" rel="noreferrer">作者主页 ↗</a>
      </footer>
    </main>
  );
}
