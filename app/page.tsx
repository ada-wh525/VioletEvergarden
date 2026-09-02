"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";

const profile = [
  { label: "日文名", value: "ヴァイオレット・エヴァーガーデン" },
  { label: "身份", value: "自动手记人偶 / 前军人" },
  { label: "所属", value: "C.H. 邮政公司" },
  { label: "生日", value: "官方未公开" },
  { label: "年龄", value: "约 14 岁" },
  { label: "声优", value: "石川由依" },
  { label: "出身", value: "不详" },
  { label: "重要之物", value: "祖母绿胸针 · 信件" },
];

const storyLetters = [
  {
    no: "01",
    title: "替相爱的人说真话",
    text: "她逐渐明白，一封好信并非堆砌漂亮辞藻，而是让两颗心愿意向彼此靠近。",
    tag: "恋心",
  },
  {
    no: "02",
    title: "替离开的人留下时间",
    text: "有些信不会立刻寄出。它们跨过岁月，在每一个生日里重新成为拥抱。",
    tag: "亲情",
  },
  {
    no: "03",
    title: "替沉默的人找到声音",
    text: "从战场到邮局，她用曾经只会握住武器的双手，为别人保存温柔。",
    tag: "成长",
  },
];

const journeys = [
  {
    chapter: "PROLOGUE",
    label: "战火之后",
    title: "从命令，走向自己的愿望",
    text: "大战结束，失去双臂的少女从漫长昏睡中醒来。她记得战场、少佐和最后那句话，却还不知道该如何继续生活。",
    motif: "银色义手",
  },
  {
    chapter: "CHAPTER I",
    label: "成为人偶",
    title: "“我想知道，爱是什么。”",
    text: "她来到 C.H. 邮政公司，第一次看见有人将说不出口的思念变成一封信。于是，寻找那句话意义的旅程开始了。",
    motif: "打字机",
  },
  {
    chapter: "CHAPTER II",
    label: "代笔旅程",
    title: "每一封信，都让心有了形状",
    text: "公主的公开情书、剧作家的湖上飞跃、母亲留给女儿的五十封生日信……她聆听别人，也终于听见自己。",
    motif: "五十封信",
  },
  {
    chapter: "CHAPTER III",
    label: "守护邮路",
    title: "不再作为武器，而是作为一个人",
    text: "旧时代的伤痕并未随着停战消失。面对再次燃起的火光，她选择保护连接人们的邮路，也选择直面自己的过去。",
    motif: "和平列车",
  },
  {
    chapter: "EPILOGUE",
    label: "永远此后",
    title: "信会抵达，爱也会",
    text: "时代向电话与电波前进，写信的人越来越少。但被她认真写下的心意，仍在许多年后照亮某个人。",
    motif: "紫罗兰花",
  },
];

const quotes = [
  { text: "我想知道「爱してる」是什么意思。", source: "一切旅程的起点" },
  { text: "有些心意，只有认真写下来，才知道它一直都在。", source: "本站致薇尔莉特" },
  { text: "哪怕相隔遥远，思念也会沿着信纸抵达。", source: "本站致每一位写信的人" },
];

const colors = [
  { name: "普鲁士蓝", en: "PRUSSIAN BLUE", hex: "#263E62", className: "prussian", fontLabel: "经典衬线" },
  { name: "绣球花蓝", en: "HYDRANGEA", hex: "#91AFC2", className: "hydrangea", fontLabel: "轻盈无衬线" },
  { name: "信笺象牙白", en: "LETTER IVORY", hex: "#F1EBDD", className: "ivory", fontLabel: "书卷衬线" },
  { name: "古典鎏金", en: "ANTIQUE GOLD", hex: "#B18B52", className: "antique", fontLabel: "古典斜体" },
  { name: "缎带酒红", en: "RIBBON WINE", hex: "#743D4B", className: "ribbon", fontLabel: "现代无衬线" },
];

const works = [
  {
    index: "I",
    year: "2018",
    title: "电视动画",
    meta: "13 话 + Extra Episode",
    copy: "从“爱是什么”的疑问开始，完整认识她与 C.H. 邮政公司的伙伴们。",
    href: "https://zh.wikipedia.org/wiki/紫罗兰永恒花园",
  },
  {
    index: "II",
    year: "2019",
    title: "外传：永远与自动手记人偶",
    meta: "剧场作品 · 91 min",
    copy: "关于姐妹、名字与跨越阶级的牵挂，一封被时间接力送达的信。",
    href: "https://zh.wikipedia.org/wiki/紫羅蘭永恆花園外傳：永遠與自動手記人偶",
  },
  {
    index: "III",
    year: "2020",
    title: "剧场版",
    meta: "故事终章 · 140 min",
    copy: "当通信方式改变，她仍在追寻尚未抵达的答案。建议最后观看。",
    href: "https://zh.wikipedia.org/wiki/紫羅蘭永恆花園電影版",
  },
];

const LetterIcon = () => <span className="letter-icon" aria-hidden="true" />;

const drawTrackedText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
) => {
  let cursor = x;
  Array.from(text).forEach((character) => {
    context.fillText(character, cursor, y);
    cursor += context.measureText(character).width + tracking;
  });
};

const wrapCanvasText = (context: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const lines: string[] = [];
  text.split("\n").forEach((paragraph) => {
    if (!paragraph) {
      lines.push("");
      return;
    }
    let line = "";
    Array.from(paragraph).forEach((character) => {
      const nextLine = `${line}${character}`;
      if (line && context.measureText(nextLine).width > maxWidth) {
        lines.push(line);
        line = character;
      } else {
        line = nextLine;
      }
    });
    if (line) lines.push(line);
  });
  return lines;
};

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [activeJourney, setActiveJourney] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [activeColor, setActiveColor] = useState(0);
  const [toast, setToast] = useState("");
  const [letterText, setLetterText] = useState("");
  const [signature, setSignature] = useState("");
  const [sealed, setSealed] = useState(false);
  const [deliveryState, setDeliveryState] = useState<"idle" | "sending" | "delivered">("idle");
  const [keepsakeOpen, setKeepsakeOpen] = useState(false);
  const [keepsakeUrl, setKeepsakeUrl] = useState("");
  const [keepsakeStatus, setKeepsakeStatus] = useState<"idle" | "generating" | "ready" | "error">("idle");
  const [petalBurst, setPetalBurst] = useState(0);
  const [spoilers, setSpoilers] = useState(false);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const letterSectionRef = useRef<HTMLElement>(null);
  const letterPreviewRef = useRef<HTMLDivElement>(null);
  const journeyTabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const keepsakeDialogRef = useRef<HTMLDivElement>(null);
  const keepsakeCloseRef = useRef<HTMLButtonElement>(null);
  const focusReturnRef = useRef<HTMLElement | null>(null);
  const keepsakeUrlRef = useRef<string | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const toneTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeTheme = colors[activeColor];

  useEffect(() => {
    document.body.classList.add("motion-ready");
    const revealObserver = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("is-visible");
      }),
      { threshold: 0.14 },
    );
    document.querySelectorAll("[data-reveal]").forEach((node) => revealObserver.observe(node));

    const topObserver = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
    if (topSentinelRef.current) topObserver.observe(topSentinelRef.current);

    const sectionObserver = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveSection(entry.target.id);
      }),
      { rootMargin: "-28% 0px -58% 0px" },
    );
    document.querySelectorAll("#story, #profile, #journey, #support").forEach((node) => sectionObserver.observe(node));

    return () => {
      revealObserver.disconnect();
      topObserver.disconnect();
      sectionObserver.disconnect();
      document.body.classList.remove("motion-ready");
      if (toneTimerRef.current) clearInterval(toneTimerRef.current);
      if (keepsakeUrlRef.current) URL.revokeObjectURL(keepsakeUrlRef.current);
      void audioRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2300);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!keepsakeOpen) return;
    const dialog = keepsakeDialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    keepsakeCloseRef.current?.focus();

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setKeepsakeOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      focusReturnRef.current?.focus();
    };
  }, [keepsakeOpen]);

  useEffect(() => {
    if (deliveryState === "sending") {
      const timer = setTimeout(() => {
        setDeliveryState("delivered");
        setPetalBurst((value) => value + 1);
        setToast("信件已经穿过花海，送往远方");
      }, 2400);
      return () => clearTimeout(timer);
    }
    if (deliveryState === "delivered") {
      const timer = setTimeout(() => {
        setDeliveryState("idle");
        setKeepsakeOpen(true);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [deliveryState]);

  const generateKeepsake = async (text: string, author: string) => {
    const section = letterSectionRef.current;
    const preview = letterPreviewRef.current;
    if (!section || !preview) return;

    setKeepsakeStatus("generating");
    setKeepsakeUrl("");
    if (keepsakeUrlRef.current) {
      URL.revokeObjectURL(keepsakeUrlRef.current);
      keepsakeUrlRef.current = null;
    }

    try {
      await document.fonts.ready;
      const sectionStyle = getComputedStyle(section);
      const previewStyle = getComputedStyle(preview);
      const palette = {
        background: sectionStyle.getPropertyValue("--letter-section-bg").trim() || "#d8dce2",
        paper: sectionStyle.getPropertyValue("--letter-paper").trim() || "#f5f2eb",
        ink: sectionStyle.getPropertyValue("--letter-ink").trim() || "#263e62",
        accent: sectionStyle.getPropertyValue("--letter-accent").trim() || "#263e62",
        accentSoft: sectionStyle.getPropertyValue("--letter-accent-soft").trim() || "#91afc2",
        seal: sectionStyle.getPropertyValue("--letter-seal").trim() || "#263e62",
      };
      const fontFamily = previewStyle.fontFamily || '"Cormorant Garamond", "Noto Sans SC", serif';
      const isItalic = sectionStyle.getPropertyValue("--letter-font-style").trim() === "italic";
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1600;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is unavailable");

      context.fillStyle = palette.background;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.globalAlpha = 0.08;
      context.strokeStyle = palette.accent;
      context.lineWidth = 1;
      for (let y = 20; y < canvas.height; y += 28) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(canvas.width, y + 38);
        context.stroke();
      }
      context.globalAlpha = 1;

      const paperX = 86;
      const paperY = 70;
      const paperWidth = 1028;
      const paperHeight = 1460;
      context.shadowColor = "rgba(35, 31, 28, 0.18)";
      context.shadowBlur = 45;
      context.shadowOffsetY = 20;
      context.fillStyle = palette.paper;
      context.fillRect(paperX, paperY, paperWidth, paperHeight);
      context.shadowColor = "transparent";
      context.globalAlpha = 0.26;
      context.strokeStyle = palette.accent;
      context.lineWidth = 2;
      context.strokeRect(paperX + 24, paperY + 24, paperWidth - 48, paperHeight - 48);
      context.globalAlpha = 1;

      context.save();
      context.beginPath();
      context.rect(paperX, paperY, paperWidth, 14);
      context.clip();
      for (let x = paperX - 50, index = 0; x < paperX + paperWidth + 50; x += 54, index += 1) {
        context.fillStyle = index % 2 === 0 ? palette.accent : palette.accentSoft;
        context.beginPath();
        context.moveTo(x, paperY);
        context.lineTo(x + 30, paperY);
        context.lineTo(x + 18, paperY + 14);
        context.lineTo(x - 12, paperY + 14);
        context.closePath();
        context.fill();
      }
      context.restore();

      context.fillStyle = palette.accent;
      context.font = `600 18px ${fontFamily}`;
      drawTrackedText(context, "LEIDENSCHAFTLICH · C.H. POSTAL", 176, 178, 4.2);
      context.textAlign = "right";
      context.globalAlpha = 0.65;
      context.font = `500 17px ${fontFamily}`;
      context.fillText(`${activeTheme.name} · ${activeTheme.en}`, 1024, 178);
      context.textAlign = "left";
      context.globalAlpha = 1;

      context.strokeStyle = palette.accent;
      context.globalAlpha = 0.2;
      context.beginPath();
      context.moveTo(176, 222);
      context.lineTo(1024, 222);
      context.stroke();
      context.globalAlpha = 1;

      context.fillStyle = palette.accent;
      context.font = `italic 500 66px ${fontFamily}`;
      context.fillText("Dear Violet,", 176, 355);

      context.fillStyle = palette.ink;
      context.font = `${isItalic ? "italic " : ""}400 34px ${fontFamily}`;
      const lines = wrapCanvasText(context, text, 848);
      lines.slice(0, 13).forEach((line, index) => {
        context.fillText(line, 176, 480 + index * 61);
      });

      context.textAlign = "right";
      context.fillStyle = palette.accent;
      context.font = `italic 500 37px ${fontFamily}`;
      context.fillText(author, 1018, 1288);
      context.textAlign = "left";

      const sealX = 600;
      const sealY = 1390;
      const sealRadius = 67;
      const sealGradient = context.createRadialGradient(sealX - 20, sealY - 22, 8, sealX, sealY, sealRadius);
      sealGradient.addColorStop(0, palette.accentSoft);
      sealGradient.addColorStop(0.45, palette.seal);
      sealGradient.addColorStop(1, palette.ink);
      context.fillStyle = sealGradient;
      context.beginPath();
      context.arc(sealX, sealY, sealRadius, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 0.55;
      context.strokeStyle = palette.paper;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(sealX, sealY, 50, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = 1;
      context.fillStyle = palette.paper;
      context.textAlign = "center";
      context.font = `italic 500 55px ${fontFamily}`;
      context.fillText("V", sealX, sealY + 17);

      context.fillStyle = palette.accent;
      context.globalAlpha = 0.55;
      context.font = `500 15px ${fontFamily}`;
      context.fillText("LETTERS FROM THE HEART  ·  VIOLETEVER.GARDEN", sealX, 1490);
      context.globalAlpha = 1;
      context.textAlign = "left";

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Image export failed")), "image/png");
      });
      const url = URL.createObjectURL(blob);
      keepsakeUrlRef.current = url;
      setKeepsakeUrl(url);
      setKeepsakeStatus("ready");
    } catch {
      setKeepsakeStatus("error");
    }
  };

  const playChime = (context: AudioContext) => {
    const now = context.currentTime;
    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, now + index * 0.18);
      gain.gain.linearRampToValueAtTime(0.025, now + index * 0.18 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.18 + 1.25);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now + index * 0.18);
      oscillator.stop(now + index * 0.18 + 1.3);
    });
  };

  const toggleSound = async () => {
    if (isSoundOn) {
      if (toneTimerRef.current) clearInterval(toneTimerRef.current);
      toneTimerRef.current = null;
      await audioRef.current?.close();
      audioRef.current = null;
      setIsSoundOn(false);
      return;
    }
    const context = new AudioContext();
    audioRef.current = context;
    playChime(context);
    toneTimerRef.current = setInterval(() => playChime(context), 9200);
    setIsSoundOn(true);
  };

  const selectLetterTheme = (index: number) => {
    setActiveColor(index);
    setSealed(false);
    setDeliveryState("idle");
    setKeepsakeOpen(false);
    setToast(`${colors[index].name}信笺已启用`);
  };

  const sealLetter = () => {
    if (!letterText.trim()) {
      setToast("请先写下一句话");
      return;
    }
    const author = signature || "一位远方的读者";
    focusReturnRef.current = document.activeElement as HTMLElement;
    const letter = { text: letterText, signature: author, theme: activeTheme.className, savedAt: new Date().toISOString() };
    localStorage.setItem("violet-fan-letter", JSON.stringify(letter));
    setSealed(true);
    setKeepsakeOpen(false);
    setDeliveryState("sending");
    void generateKeepsake(letterText.trim(), author);
    if (audioRef.current) playChime(audioRef.current);
  };

  return (
    <main>
      <div className="top-sentinel" ref={topSentinelRef} aria-hidden="true" />
      <div className="reading-progress" aria-hidden="true" />
      <nav className={`site-nav ${scrolled ? "is-scrolled" : ""}`} aria-label="主导航">
        <a className="brand" href="#top" aria-label="薇尔莉特纪念站首页">
          <span className="brand-mark">V</span>
          <span className="brand-name">VIOLET<br />EVERGARDEN</span>
        </a>
        <button
          className="menu-toggle"
          type="button"
          aria-label={menuOpen ? "关闭导航" : "打开导航"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span />
          <span />
        </button>
        <div className={`nav-links ${menuOpen ? "is-open" : ""}`}>
          <a className={activeSection === "story" ? "active" : ""} aria-current={activeSection === "story" ? "location" : undefined} href="#story" onClick={() => setMenuOpen(false)}>她的故事</a>
          <a className={activeSection === "profile" ? "active" : ""} aria-current={activeSection === "profile" ? "location" : undefined} href="#profile" onClick={() => setMenuOpen(false)}>人物档案</a>
          <a className={activeSection === "journey" ? "active" : ""} aria-current={activeSection === "journey" ? "location" : undefined} href="#journey" onClick={() => setMenuOpen(false)}>书信旅程</a>
          <a className={activeSection === "support" ? "active" : ""} aria-current={activeSection === "support" ? "location" : undefined} href="#support" onClick={() => setMenuOpen(false)}>应援手册</a>
        </div>
        <button
          className="sound-toggle"
          type="button"
          aria-label={isSoundOn ? "关闭信笺轻音" : "开启信笺轻音"}
          aria-pressed={isSoundOn}
          onClick={() => void toggleSound()}
        >
          <span className="sound-bars" aria-hidden="true"><i /><i /><i /></span>
          {isSoundOn ? "静听中" : "聆听"}
        </button>
      </nav>

      <section className="hero" id="top">
        <div className="hero-paper" aria-hidden="true" />
        <div className="hero-copy">
          <div className="eyebrow"><span>致 未曾谋面的你</span><i /></div>
          <h1 lang="zh-CN">
            <span className="script-word">薇尔莉特</span>
            <span className="serif-word">伊芙加登</span>
          </h1>
          <p className="hero-intro">
            <strong>写给世界的，第十四封信。</strong>
            <span>她穿越战火与思念，替人们寻找最难说出口的那句话。这一次，请让我们把爱意写给她。</span>
          </p>
          <div className="hero-actions">
            <a className="primary-cta" href="#story"><LetterIcon />开启这封信</a>
            <a className="text-link" href="#profile">认识薇尔莉特 <span>↗</span></a>
          </div>
        </div>

        <div className="hero-visual" role="img" aria-label="薇尔莉特原创角色插画">
          <div className="hero-shade" />
          <div className="floating-caption">
            <p>AUTO MEMORIES DOLL<br /><b>莱顿沙夫特里希 · C.H. 邮政公司</b></p>
          </div>
          <button className="wax-seal hero-seal" type="button" aria-label="撒下紫罗兰花瓣" onClick={() => setPetalBurst((value) => value + 1)}><span>V</span></button>
        </div>
      </section>

      <section className="story-section section-shell" id="story">
        <div className="section-heading" data-reveal>
          <p className="section-kicker">THE STORY OF A LETTER</p>
          <h2>她把无法说出口的爱，<br /><em>写成了可以抵达的信。</em></h2>
        </div>
        <div className="story-grid">
          <div className="story-image-wrap" data-reveal>
            <div className="story-image" role="img" aria-label="列车窗边的薇尔莉特原创插画" />
            <div className="photo-corner top-left" />
            <div className="photo-corner bottom-right" />
          </div>
          <div className="story-copy" data-reveal>
            <p className="dropcap">曾经，她只理解命令与胜负。战争带走了双臂，也留下了一句无法理解的“爱してる”。为了寻找它的意义，薇尔莉特成为替人书写心意的自动手记人偶。</p>
            <p>一次次聆听、一次次落笔，她发现悲伤并不会因为被说出而消失，但有人愿意替你记住，它就不再只是孤独。</p>
            <div className="mini-facts">
              <div><b>01</b><span>聆听<br />LISTEN</span></div>
              <div><b>02</b><span>理解<br />UNDERSTAND</span></div>
              <div><b>03</b><span>抵达<br />DELIVER</span></div>
            </div>
          </div>
        </div>
        <div className="story-letter-row">
          {storyLetters.map((item) => (
            <article className="story-letter" key={item.no} data-reveal>
              <div className="letter-top"><span>{item.no}</span><i>{item.tag}</i></div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <span className="fold-line" aria-hidden="true" />
            </article>
          ))}
        </div>
      </section>

      <section className="profile-section" id="profile">
        <div className="profile-backdrop" aria-hidden="true">V</div>
        <div className="section-shell profile-shell">
          <div className="profile-intro" data-reveal>
            <h2>Violet<br /><em>Evergarden</em></h2>
            <p className="profile-jp">ヴァイオレット・エヴァーガーデン</p>
            <div className="profile-symbols">
              <span>✦</span>
              <p>像她名字里的紫罗兰一样，<br />在漫长冬日之后安静盛放。</p>
            </div>
          </div>
          <div className="profile-card" data-reveal>
            <div className="profile-photo" role="img" aria-label="薇尔莉特侧面人物插画">
              <span className="profile-stamp">C.H.<br />POSTAL</span>
            </div>
            <div className="profile-data">
              {profile.map((item) => (
                <div className="profile-row" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  {item.note && <small>{item.note}</small>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="journey-section section-shell" id="journey">
        <div className="journey-heading" data-reveal>
          <div>
            <h2>从“爱是什么”，<br /><em>到终于懂得爱。</em></h2>
          </div>
          <p>轻触章节，翻阅她从战场走向人群的旅程。内容保持温和剧透，终章细节默认隐藏。</p>
        </div>

        <div className="journey-tabs" role="tablist" aria-label="薇尔莉特旅程章节" data-reveal>
          {journeys.map((journey, index) => (
            <button
              key={journey.chapter}
              type="button"
              role="tab"
              id={`journey-tab-${index}`}
              aria-controls={`journey-panel-${index}`}
              aria-selected={activeJourney === index}
              tabIndex={activeJourney === index ? 0 : -1}
              className={activeJourney === index ? "active" : ""}
              onClick={() => setActiveJourney(index)}
              onKeyDown={(event) => {
                const lastIndex = journeys.length - 1;
                const nextIndex = event.key === "ArrowRight" ? (index + 1) % journeys.length
                  : event.key === "ArrowLeft" ? (index - 1 + journeys.length) % journeys.length
                    : event.key === "Home" ? 0
                      : event.key === "End" ? lastIndex
                        : index;
                if (nextIndex === index && !["Home", "End"].includes(event.key)) return;
                event.preventDefault();
                setActiveJourney(nextIndex);
                journeyTabRefs.current[nextIndex]?.focus();
              }}
              ref={(node) => { journeyTabRefs.current[index] = node; }}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <b>{journey.label}</b>
            </button>
          ))}
        </div>

        <div className="journey-stage" data-reveal>
          <div className="journey-motif" aria-hidden="true">
            <span>{String(activeJourney + 1).padStart(2, "0")}</span>
            <i>{journeys[activeJourney].motif}</i>
          </div>
          <div className="journey-copy" key={activeJourney} role="tabpanel" id={`journey-panel-${activeJourney}`} aria-labelledby={`journey-tab-${activeJourney}`} tabIndex={0}>
            <p>{journeys[activeJourney].chapter}</p>
            <h3>{journeys[activeJourney].title}</h3>
            <div className={activeJourney === 4 && !spoilers ? "spoiler-copy is-covered" : "spoiler-copy"}>
              <p>{journeys[activeJourney].text}</p>
            </div>
            {activeJourney === 4 && (
              <button className="spoiler-button" type="button" onClick={() => setSpoilers((value) => !value)}>
                {spoilers ? "收起终章提示" : "揭开温和剧透"}
              </button>
            )}
          </div>
          <div className="journey-ornament" aria-hidden="true"><span>V</span></div>
        </div>
      </section>

      <section className="quote-section">
        <div className="quote-paper" data-reveal>
          <p className="quote-mark" aria-hidden="true">“</p>
          <div className="quote-counter">0{quoteIndex + 1} / 0{quotes.length}</div>
          <blockquote key={quoteIndex}>
            <p>{quotes[quoteIndex].text}</p>
            <cite>{quotes[quoteIndex].source}</cite>
          </blockquote>
          <div className="quote-controls">
            <button type="button" aria-label="上一句" onClick={() => setQuoteIndex((quoteIndex - 1 + quotes.length) % quotes.length)}>←</button>
            <div>{quotes.map((_, index) => <i className={index === quoteIndex ? "active" : ""} key={index} />)}</div>
            <button type="button" aria-label="下一句" onClick={() => setQuoteIndex((quoteIndex + 1) % quotes.length)}>→</button>
          </div>
        </div>
      </section>

      <section className="watch-section section-shell">
        <div className="watch-heading" data-reveal>
          <h2>把故事，<em>按寄达顺序打开。</em></h2>
        </div>
        <div className="work-list">
          {works.map((work) => (
            <a className="work-card" key={work.index} data-reveal href={work.href} target="_blank" rel="noreferrer" aria-label={`在维基百科查看${work.title}`}>
              <div className="work-index">{work.index}</div>
              <div className="work-year">{work.year}</div>
              <div className="work-main"><h3>{work.title}</h3><p>{work.meta}</p></div>
              <p className="work-copy">{work.copy}</p>
              <span className="work-arrow">↗</span>
            </a>
          ))}
        </div>
      </section>

      <section className="support-section" id="support">
        <div className="section-shell">
          <div className="support-heading" data-reveal>
            <div>
              <h2>把喜欢变成一束<br /><em>有分寸的光。</em></h2>
            </div>
          </div>

          <div className="palette-instruction" data-reveal>
            <span>SELECT A LETTER MOOD</span>
            <p>选择一款信笺主题，下方书信会同步换色与字体。</p>
          </div>

          <div className="palette" data-reveal>
            {colors.map((color, index) => (
              <button
                className={`color-swatch ${color.className} ${activeColor === index ? "is-selected" : ""}`}
                type="button"
                key={color.hex}
                aria-label={`选择${color.name}信笺主题`}
                aria-pressed={activeColor === index}
                aria-controls="write"
                onClick={() => selectLetterTheme(index)}
              >
                <span className="color-fill"><i>{activeColor === index ? "已选择" : "选择主题"}</i></span>
                <span className="color-info"><b>{color.name}</b><small>{color.en} · {color.hex}</small><em>{color.fontLabel}</em></span>
              </button>
            ))}
          </div>

          <div className="support-rules">
            <article data-reveal><span>01</span><h3>尊重创作者</h3><p>支持正版作品与官方渠道，让每一次喜欢都有温度，也有边界。</p></article>
            <article data-reveal><span>02</span><h3>温柔标注剧透</h3><p>分享名场面时为后来者留一只信封，让第一次打开仍保有惊喜。</p></article>
            <article data-reveal><span>03</span><h3>认真对待同好</h3><p>喜欢可以有不同版本；像薇尔莉特聆听委托人那样，先理解，再表达。</p></article>
          </div>
        </div>
      </section>

      <section className={`letter-section theme-${activeTheme.className}`} id="write" ref={letterSectionRef}>
        <div className="letter-flowers" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        <div className="letter-section-heading" data-reveal>
          <p className="section-kicker">ONE LAST LETTER</p>
          <h2>现在，换你写给她。</h2>
          <div className="active-letter-theme" aria-live="polite">
            <i className={`theme-dot ${activeTheme.className}`} />
            <span>当前信笺</span>
            <b>{activeTheme.name}</b>
            <em>{activeTheme.fontLabel}</em>
          </div>
        </div>
        <div className={`letter-composer ${sealed ? "is-sealed" : ""} ${deliveryState === "sending" ? "is-sending" : ""}`} data-reveal>
          <div className="letter-form">
            <label htmlFor="letter-message">亲爱的薇尔莉特：</label>
            <textarea
              id="letter-message"
              maxLength={180}
              placeholder="如果有一句话可以抵达她身边，你会写什么？"
              value={letterText}
              onChange={(event) => { setLetterText(event.target.value); setSealed(false); setDeliveryState("idle"); setKeepsakeOpen(false); }}
            />
            <div className="letter-form-bottom">
              <label htmlFor="letter-signature">FROM</label>
              <input id="letter-signature" maxLength={24} placeholder="一位远方的读者" value={signature} onChange={(event) => { setSignature(event.target.value); setKeepsakeOpen(false); }} />
              <span>{letterText.length} / 180</span>
            </div>
          </div>
          <div className="letter-preview" ref={letterPreviewRef}>
            <div className="airmail-line" />
            <p className="preview-place">LEIDENSCHAFTLICH · CH POSTAL</p>
            <div className="preview-body">
              <p className="preview-dear">Dear Violet,</p>
              <p className={letterText ? "" : "is-placeholder"}>{letterText || "你写下的心意，会在这里成为一封信。"}</p>
              <p className="preview-sign">{signature || "一位远方的读者"}</p>
            </div>
            <button className="wax-seal letter-seal" type="button" aria-label="用火漆封缄并寄出信件" onClick={sealLetter} disabled={deliveryState === "sending"}><span>V</span></button>
            <p className="seal-hint">{sealed ? "SENT WITH LOVE" : "轻触火漆，寄出这封信"}</p>
          </div>
        </div>
      </section>

      <footer>
        <div className="footer-brand">
          <span className="brand-mark">V</span>
          <div><b>LETTERS FROM THE HEART</b><p>一封由爱好者写给薇尔莉特的信</p></div>
        </div>
        <div className="footer-links">
          <a href="https://tv.violet-evergarden.jp/" target="_blank" rel="noreferrer">TV 动画官方网站 ↗</a>
          <a href="https://violet-evergarden.jp/" target="_blank" rel="noreferrer">剧场版官方网站 ↗</a>
          <a href="#top">回到信首 ↑</a>
        </div>
        <p className="disclaimer">非官方网站 · 角色与作品版权归原作者及制作委员会所有 · 页面插画为 AI 生成的非商业同人创作</p>
        <a className="secret-contact" href="/contact"><span>✦</span> 隐秘角落 · 联系作者</a>
      </footer>

      {deliveryState !== "idle" && (
        <div className={`delivery-flight ${deliveryState}`} role="status" aria-live="polite">
          <div className="flight-orbit" aria-hidden="true"><i /><i /><i /></div>
          <div className="flight-envelope" aria-hidden="true"><span /><i>V</i></div>
          <p>
            <strong>{deliveryState === "sending" ? "信件正在启程" : "心意已经送达"}</strong>
            <span>{deliveryState === "sending" ? "DELIVERING YOUR LETTER" : "DELIVERED WITH LOVE"}</span>
          </p>
        </div>
      )}

      {keepsakeOpen && (
        <div className="keepsake-overlay" role="dialog" aria-modal="true" aria-labelledby="keepsake-title" aria-describedby="keepsake-description" ref={keepsakeDialogRef}>
          <div className="keepsake-card">
            <button className="keepsake-close" ref={keepsakeCloseRef} type="button" aria-label="关闭纪念信笺" onClick={() => setKeepsakeOpen(false)}>×</button>
            <div className="keepsake-copy">
              <h2 id="keepsake-title">把抵达的心意，<br /><em>留成一页纪念。</em></h2>
              <p id="keepsake-description">你选择的信笺主题、文字与署名，已经被装订进这张纪念图。</p>
              <div className="keepsake-actions">
                {keepsakeStatus === "ready" && keepsakeUrl ? (
                  <a href={keepsakeUrl} download={`letter-to-violet-${activeTheme.className}.png`}><span>↓</span> 下载纪念信笺</a>
                ) : (
                  <button type="button" disabled>{keepsakeStatus === "error" ? "生成遇到问题" : "正在生成信笺…"}</button>
                )}
                <button type="button" onClick={() => setKeepsakeOpen(false)}>继续阅读</button>
              </div>
            </div>
            <div className="keepsake-preview" aria-live="polite">
              {keepsakeStatus === "ready" && keepsakeUrl ? (
                // Blob URLs are generated in-browser and cannot use Next image optimization.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={keepsakeUrl} alt="根据所选主题生成的纪念信笺预览" />
              ) : (
                <div className="keepsake-loading"><i /><span>{keepsakeStatus === "error" ? "信笺暂未生成，请重新寄出一次" : "正在晾干墨迹"}</span></div>
              )}
            </div>
          </div>
        </div>
      )}

      {petalBurst > 0 && (
        <div className="petal-burst" key={petalBurst} aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => <i key={index} style={{ "--i": index } as CSSProperties} />)}
        </div>
      )}
      <div className={`toast ${toast ? "is-visible" : ""}`} role="status" aria-live="polite">{toast}</div>
      <a className={`back-top ${scrolled ? "is-visible" : ""}`} href="#top" aria-label="返回页面顶部">↑</a>
    </main>
  );
}
