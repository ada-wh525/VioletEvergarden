"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";

type LetterTheme = "hydrangea" | "ivory" | "wine";

type PublicLetter = {
  id: string;
  addressee: string;
  content: string | string[];
  author: string;
  date: string;
  theme: LetterTheme;
  likes?: number;
};

type ViewMode = "receive" | "send";
type ReadState = "sealed" | "loading" | "open" | "error" | "empty";
type SubmitState = "idle" | "sending" | "success" | "error";

const LETTER_API_ENABLED = process.env.NEXT_PUBLIC_LETTER_API_ENABLED === "true";
const PENDING_STORAGE_KEY = "violet-pending-letters";
const REPORTED_STORAGE_KEY = "violet-reported-letters";
const LIKED_STORAGE_KEY = "violet-liked-letters";
const MAX_LETTER_LENGTH = 600;

const SAMPLE_LETTERS: PublicLetter[] = [
  {
    id: "demo-01",
    addressee: "写给同样在等待答案的人",
    content: [
      "我曾以为等待是一间没有窗的房间，后来才发现，只要还愿意等，心里就仍然留着一扇门。",
      "如果你今天也没有等到想要的回答，请先替明天保管一点期待。并不是所有迟来的话都会失去意义。",
      "愿下一次风吹过来的时候，你能听见属于自己的回音。",
    ],
    author: "北方港口的旅人",
    date: "雨季后的第七日",
    theme: "hydrangea",
  },
  {
    id: "demo-02",
    addressee: "给一位还没来得及道歉的陌生人",
    content: [
      "很久以前，我把一句对不起留在了车站。列车开走以后，我才知道有些话不说出口，就会在心里反复抵达。",
      "后来我写了一封没有地址的信，不求被原谅，只想承认那一天的沉默确实伤害了一个珍贵的人。",
      "如果你也有一句迟到的话，希望你比我勇敢一点。",
    ],
    author: "一位正在学会告别的人",
    date: "初雪以前",
    theme: "ivory",
  },
  {
    id: "demo-03",
    addressee: "给偶然拆开这封信的你",
    content: [
      "今天的天空很普通，我却忽然想把它寄给一个不认识的人。云走得很慢，街边的花开了一小簇，面包店比平时早亮了灯。",
      "也许生活真正温柔的地方，就藏在这些没人特意记录的时刻里。",
      "希望你读到这里时，也能抬头找到一件值得喜欢的小事。",
    ],
    author: "来自雨季的读者",
    date: "春日午后",
    theme: "hydrangea",
  },
  {
    id: "demo-04",
    addressee: "写给没有说出口的喜欢",
    content: [
      "我没有把喜欢告诉那个人。不是因为它不够真，而是因为那时的我还不知道，真心也需要被好好表达。",
      "现在我们已经走向不同的地方。回望过去，我不再遗憾结局，只遗憾自己曾把温柔藏得太深。",
      "愿你珍惜心里的光，也有把它交给某个人的勇气。",
    ],
    author: "莱顿城外的一盏灯",
    date: "紫罗兰盛开的夜晚",
    theme: "wine",
  },
  {
    id: "demo-05",
    addressee: "给正在努力长大的你",
    content: [
      "长大好像不是突然懂得一切，而是终于允许自己有不懂的事。允许失落，允许绕路，也允许在很累的时候停下来。",
      "你不需要每一天都表现得坚强。那些认真生活却没有被看见的时刻，也在一点点组成你。",
      "请相信，缓慢并不等于停滞。",
    ],
    author: "旧钟楼下的邮差",
    date: "第十四次钟声之后",
    theme: "ivory",
  },
  {
    id: "demo-06",
    addressee: "写给很久没有好好休息的人",
    content: [
      "你是不是已经习惯在别人问起时回答没关系，然后把疲惫安静地折好，塞进没人看见的口袋里。",
      "今晚请早一点关掉灯。没有完成的事情可以留给明天，世界不会因为你休息一会儿就失去方向。",
      "好好睡一觉。醒来的你，也值得被新的清晨接住。",
    ],
    author: "一封没有回信地址的信",
    date: "月光最安静的时候",
    theme: "wine",
  },
];

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
  const letterHeadingRef = useRef<HTMLHeadingElement>(null);

  const switchMode = (nextMode: ViewMode) => {
    setMode(nextMode);
    setSubmitMessage("");
  };

  const chooseSampleLetter = () => {
    const available = SAMPLE_LETTERS.filter((letter) => letter.id !== currentLetter?.id);
    return available[Math.floor(Math.random() * available.length)] ?? SAMPLE_LETTERS[0];
  };

  const openRandomLetter = async () => {
    setReadState("loading");
    setReportState("idle");
    setLikeState("idle");

    try {
      let nextLetter: PublicLetter;
      if (LETTER_API_ENABLED) {
        const response = await fetch("/api/random-letter", { headers: { accept: "application/json" } });
        if (response.status === 404) {
          setCurrentLetter(null);
          setReadState("empty");
          return;
        }
        if (!response.ok) throw new Error("信箱暂时无法开启");
        const payload = (await response.json()) as { letter: PublicLetter };
        nextLetter = payload.letter;
      } else {
        nextLetter = chooseSampleLetter();
      }

      setCurrentLetter(nextLetter);
      const liked = JSON.parse(localStorage.getItem(LIKED_STORAGE_KEY) ?? "[]") as string[];
      setLikeState(liked.includes(nextLetter.id) ? "done" : "idle");
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
      let likeCount = currentLetter.likes ?? 0;
      if (LETTER_API_ENABLED) {
        const response = await fetch("/api/like-letter", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: currentLetter.id }),
        });
        const payload = (await response.json()) as { likeCount?: number };
        if (!response.ok) throw new Error("喜欢未能提交");
        likeCount = payload.likeCount ?? likeCount;
      } else {
        const existing = JSON.parse(localStorage.getItem(LIKED_STORAGE_KEY) ?? "[]") as string[];
        if (!existing.includes(currentLetter.id)) likeCount += 1;
        localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify([...new Set([...existing, currentLetter.id])]));
      }
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
      if (LETTER_API_ENABLED) {
        const response = await fetch("/api/report-letter", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: currentLetter.id }),
        });
        if (!response.ok) throw new Error("举报未能提交");
      } else {
        const existing = JSON.parse(localStorage.getItem(REPORTED_STORAGE_KEY) ?? "[]") as string[];
        localStorage.setItem(REPORTED_STORAGE_KEY, JSON.stringify([...new Set([...existing, currentLetter.id])]));
      }
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

    setSubmitState("sending");
    setSubmitMessage("");
    const pendingLetter = {
      id: `local-${Date.now()}`,
      author: signature.trim() || "一位未署名的寄信人",
      content: trimmedContent,
      theme,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    try {
      if (LETTER_API_ENABLED) {
        const response = await fetch("/api/submit-letter", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(pendingLetter),
        });
        if (!response.ok) throw new Error("投递没有成功");
      } else {
        const existing = JSON.parse(localStorage.getItem(PENDING_STORAGE_KEY) ?? "[]") as unknown[];
        localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify([...existing, pendingLetter]));
      }

      setSignature("");
      setContent("");
      setPrivacyConfirmed(false);
      setSubmitState("success");
      setSubmitMessage(
        LETTER_API_ENABLED
          ? "这封信正在前往莱顿的途中。审核通过后，它才会进入陌生来信的信池。"
          : "这封信正在前往莱顿的途中。当前为演示投递，内容已进入此浏览器的待审队列。",
      );
    } catch {
      setSubmitState("error");
      setSubmitMessage("投递途中遇到了风雨，请稍后再试。");
    }
  };

  return (
    <main className="letters-page">
      <nav className="letters-nav" aria-label="陌生来信导航">
        <Link href="/" aria-label="返回薇尔莉特纪念站首页"><Brand /></Link>
        <Link className="letters-home-link" href="/">返回纪念站 <span>↗</span></Link>
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
                    <span>LETTER NO. {currentLetter.id.replace("demo-", "")}</span>
                    <time>{currentLetter.date}</time>
                  </header>
                  <h2 ref={letterHeadingRef} tabIndex={-1}>{currentLetter.addressee}</h2>
                  <div className="stranger-letter-body">
                    {(Array.isArray(currentLetter.content) ? currentLetter.content : currentLetter.content.split(/\n{2,}/)).map((paragraph, index) => <p key={`${currentLetter.id}-${index}`}>{paragraph}</p>)}
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
                  {!LETTER_API_ENABLED && <small>演示信池 · 内含 6 封样例来信</small>}
                </div>
              )}
            </div>
          ) : (
            <div className="send-panel" id="send-panel" role="tabpanel" aria-labelledby="send-tab">
              {submitState === "success" ? (
                <div className="letter-submitted" role="status" aria-live="polite">
                  <div className="submitted-stamp" aria-hidden="true"><span>V</span></div>
                  <p>LETTER DISPATCHED</p>
                  <h2>这封信正在前往<br />莱顿的途中。</h2>
                  <span>{submitMessage}</span>
                  <div>
                    <button type="button" onClick={() => { setSubmitState("idle"); setSubmitMessage(""); }}>再写一封</button>
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

                  {!LETTER_API_ENABLED && (
                    <div className="turnstile-preview" aria-label="Cloudflare Turnstile 接入位置">
                      <span>人机验证</span><small>正式信箱启用时接入 Turnstile</small><i>CF</i>
                    </div>
                  )}

                  <div className="anonymous-form-footer">
                    <button type="submit" disabled={submitState === "sending"}><span>✉</span>{submitState === "sending" ? "正在投递" : "寄往莱顿"}</button>
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
        <div><Link href="/contact">联系作者</Link><Link href="/">返回纪念站</Link></div>
      </footer>
    </main>
  );
}
