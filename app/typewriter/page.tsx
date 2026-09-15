"use client";

import { type CSSProperties, type KeyboardEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LetterDeliveryFlight, type LetterDeliveryState } from "../../components/letter-delivery-flight";
import { createLetterKeepsake } from "../../lib/letter-keepsake";
import { PRACTICE_LETTERS, PRACTICE_LANGUAGES, type PracticeLanguage } from "../../lib/typewriter/letters";
import { comparePractice } from "../../lib/typewriter/practice.mjs";
import { useTypewriterSound } from "../../lib/typewriter/use-typewriter-sound";
import "./typewriter.css";

const KEY_ROWS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "Backspace"],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Enter"],
  ["Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "ShiftRight"],
];
type RoomMode = "practice" | "free";
type ResetAction = "restart" | RoomMode | PracticeLanguage;

const SPECIAL_CODES: Record<string, string> = { Backspace: "Backspace", Enter: "Enter", ShiftLeft: "Shift", ShiftRight: "ShiftRight", Comma: ",", Period: ".", Space: "Space" };
function displayKey(key: string) { return ({ Backspace: "⌫", Enter: "↵", Shift: "⇧", ShiftRight: "⇧", Space: "空格" } as Record<string, string>)[key] ?? key; }

export default function TypewriterPage() {
  const [mode, setMode] = useState<RoomMode>("practice");
  const [addressee, setAddressee] = useState("");
  const [author, setAuthor] = useState("");
  const [exportState, setExportState] = useState<"idle" | "generating" | "ready" | "error">("idle");
  const [exportUrl, setExportUrl] = useState("");
  const [language, setLanguage] = useState<PracticeLanguage>("zh");
  const [draft, setDraft] = useState("");
  const [committed, setCommitted] = useState("");
  const [composing, setComposing] = useState(false);
  const [preedit, setPreedit] = useState("");
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState<string[]>([]);
  const [stroke, setStroke] = useState(0);
  const [returning, setReturning] = useState(false);
  const [paperVersion, setPaperVersion] = useState(0);
  const [notice, setNotice] = useState("");
  const [phase, setPhase] = useState<"writing" | "ejecting" | "sent">("writing");
  const [delivery, setDelivery] = useState<LetterDeliveryState>("idle");
  const [pendingAction, setPendingAction] = useState<ResetAction | null>(null);
  const roomRef = useRef<HTMLElement>(null);
  const paperRef = useRef<HTMLElement>(null);
  const exportUrlRef = useRef("");
  const exportGenerationRef = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const imeRef = useRef(false);
  const physicalStrokeRef = useRef(0);
  const lineRef = useRef<number | null>(null);
  const lastCommittedRef = useRef("");
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const keyTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const sound = useTypewriterSound();
  const letter = { ...PRACTICE_LETTERS[0], ...PRACTICE_LETTERS[0].versions[language] };
  const languageOption = PRACTICE_LANGUAGES.find((option) => option.id === language)!;
  const result = comparePractice(letter.body, committed);
  const isFree = mode === "free";
  const canSend = (isFree ? Boolean(committed.trim()) : result.complete) && !composing && phase === "writing";
  const salutation = isFree ? addressee : letter.addressee;
  const sender = isFree ? author : letter.signature;

  useEffect(() => () => {
    exportGenerationRef.current++;
    if (exportUrlRef.current) URL.revokeObjectURL(exportUrlRef.current);
    timersRef.current.forEach(clearTimeout);
    Object.values(keyTimersRef.current).forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (pendingAction !== null) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [pendingAction]);

  // The transparent native textarea anchors IME candidates and drives both layers' scrolling.
  useEffect(() => {
    if (bodyRef.current && inputRef.current) bodyRef.current.scrollTop = inputRef.current.scrollTop;
  }, [draft]);

  function later(callback: () => void, delay: number) {
    timersRef.current.push(setTimeout(callback, delay));
  }

  function commit(value: string) {
    const next = Array.from(value.normalize("NFC")).slice(0, (isFree ? 2000 : result.expected.length + 20)).join("");
    setDraft(next);
    setCommitted(next);
    if (next !== lastCommittedRef.current) {
      setStroke((count) => count + 1);
      // Mobile IMEs may emit only input/composition events, without physical keydown.
      if (performance.now() - physicalStrokeRef.current > 100) sound.play("key");
      lastCommittedRef.current = next;
      setNotice("");
      requestAnimationFrame(() => {
        const top = cursorRef.current?.offsetTop;
        if (top !== undefined && lineRef.current !== null && top > lineRef.current) {
          sound.play("bell");
          sound.play("return");
          setReturning(true);
          later(() => setReturning(false), 280);
        }
        lineRef.current = top ?? null;
      });
    }
  }

  function pressKey(key: string) {
    clearTimeout(keyTimersRef.current[key]);
    setPressed((keys) => keys.includes(key) ? keys : [...keys, key]);
    setStroke((count) => count + 1);
    physicalStrokeRef.current = performance.now();
    if (key === "Enter") { setReturning(true); later(() => setReturning(false), 280); }
    sound.play(key === "Space" ? "space" : key === "Enter" ? "return" : "key");
  }

  function releaseKey(key: string) {
    clearTimeout(keyTimersRef.current[key]);
    keyTimersRef.current[key] = setTimeout(() => setPressed((keys) => keys.filter((item) => item !== key)), 85);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.ctrlKey || event.metaKey || event.altKey || phase !== "writing") return;
    const key = SPECIAL_CODES[event.code] ?? event.code.replace(/^Key|^Digit/, "");
    if (/^[A-Z0-9]$/.test(key) || SPECIAL_CODES[event.code]) pressKey(key);
    // The paper wraps automatically. Enter remains available to the IME to select a candidate.
    if (!isFree && event.key === "Enter" && !event.nativeEvent.isComposing && !imeRef.current && event.keyCode !== 229) event.preventDefault();
  }

  function reset(nextMode: RoomMode = mode, nextLanguage: PracticeLanguage = language) {
    exportGenerationRef.current++;
    if (exportUrlRef.current) URL.revokeObjectURL(exportUrlRef.current);
    exportUrlRef.current = ""; setExportUrl(""); setExportState("idle");
    setMode(nextMode);
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    Object.values(keyTimersRef.current).forEach(clearTimeout);
    setLanguage(nextLanguage);
    setDraft(""); setCommitted(""); setPreedit(""); setComposing(false);
    imeRef.current = false;
    lastCommittedRef.current = "";
    lineRef.current = null;
    setPressed([]); setReturning(false); setPhase("writing"); setDelivery("idle"); setNotice("");
    setPendingAction(null); setPaperVersion((value) => value + 1);
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    if (inputRef.current) inputRef.current.scrollTop = 0;
    sound.play("paper");
    later(() => inputRef.current?.focus({ preventScroll: true }), 80);
  }

  function performReset(action: ResetAction) {
    reset(action === "practice" || action === "free" ? action : mode, action === "zh" || action === "ja" || action === "en" ? action : language);
  }

  function requestReset(action: ResetAction) {
    if (phase === "ejecting" || delivery !== "idle") return;
    if (committed && phase !== "sent") setPendingAction(action);
    else performReset(action);
  }

  async function generateExport() {
    if (!roomRef.current || !paperRef.current) return;
    const generation = ++exportGenerationRef.current;
    setExportState("generating");
    try {
      const blob = await createLetterKeepsake({
        text: committed, author: sender, addressee: salutation,
        section: roomRef.current, preview: paperRef.current,
        themeLabel: isFree ? "自由信笺 · TYPEWRITER" : "人偶练习 · TYPEWRITER",
      });
      if (generation !== exportGenerationRef.current) return;
      if (exportUrlRef.current) URL.revokeObjectURL(exportUrlRef.current);
      const url = URL.createObjectURL(blob);
      exportUrlRef.current = url;
      setExportUrl(url); setExportState("ready");
    } catch { if (generation === exportGenerationRef.current) setExportState("error"); }
  }

  function sendLetter() {
    if (!canSend) return;
    void generateExport();
    inputRef.current?.blur();
    setPhase("ejecting");
    sound.play("paper");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    later(() => {
      sound.play("stamp");
      setDelivery("sending");
      sound.play("send");
      later(() => {
        setDelivery("delivered");
        setPhase("sent");
        sound.play("bell");
        later(() => { setDelivery("idle"); requestAnimationFrame(() => document.getElementById("practice-receipt")?.focus()); }, reducedMotion ? 250 : 1450);
      }, reducedMotion ? 200 : 2400);
    }, reducedMotion ? 100 : 900);
  }

  return (
    <main className="tw-room" ref={roomRef}>
      <nav className="tw-nav" aria-label="打字室导航">
        <Link className="tw-brand" href="/"><span>V</span><div>C.H. POSTAL COMPANY<small>薇尔莉特纪念站</small></div></Link>
        <Link className="tw-back" href="/">返回花园 <span aria-hidden="true">↗</span></Link>
      </nav>

      <div className="tw-room-heading">
        <h1>练习成为人偶</h1>
      </div>

      <div className="tw-mode-tabs" role="tablist" tabIndex={-1} aria-label="打字室模式" onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
        const index = tabs.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : (index + 1) % 2;
        tabs[next]?.focus();
      }}>
        <button type="button" id="practice-mode" role="tab" aria-selected={!isFree} aria-controls="typewriter-panel" disabled={phase === "ejecting" || delivery !== "idle"} onClick={() => { if (isFree) requestReset("practice"); }}><span>01</span>经典信件练习</button>
        <button type="button" id="free-mode" role="tab" aria-selected={isFree} aria-controls="typewriter-panel" disabled={phase === "ejecting" || delivery !== "idle"} onClick={() => { if (!isFree) requestReset("free"); }}><span>02</span>空白打字室</button>
      </div>
      <div className="tw-workspace" id="typewriter-panel" role="tabpanel" aria-labelledby={isFree ? "free-mode" : "practice-mode"}>
        <aside className="tw-sidebar" aria-label="打字室设置">
          {isFree ? <div className="tw-free-fields">
            <label>收件人<input value={addressee} maxLength={40} disabled={phase !== "writing"} onChange={(event) => setAddressee(event.target.value)} placeholder="收件人" /></label>
            <label>署名<input value={author} maxLength={40} disabled={phase !== "writing"} onChange={(event) => setAuthor(event.target.value)} placeholder="署名" /></label>
          </div> : <div className="tw-practice-options">
            <h2>致少佐</h2>
            <div className="tw-language-switch" role="group" aria-label="练习语言">
              {PRACTICE_LANGUAGES.map((option) => <button key={option.id} type="button" lang={option.id} aria-pressed={language === option.id} disabled={phase === "ejecting" || delivery !== "idle"} onClick={() => { if (option.id !== language) requestReset(option.id); }}>{option.label}</button>)}
            </div>
          </div>}
          <div className="tw-settings">
            <button type="button" onClick={sound.toggle} aria-pressed={sound.enabled} className="tw-sound"><span className={`tw-sound-bars ${sound.enabled ? "on" : ""}`} aria-hidden="true"><i /><i /><i /><i /></span>{sound.enabled ? "机械音效已开启" : "机械音效已关闭"}</button>
            <button type="button" className="tw-reset" onClick={() => requestReset("restart")} disabled={phase === "ejecting" || delivery !== "idle"}>重新放入信纸 <span aria-hidden="true">↻</span></button>
          </div>

        </aside>

        <section className="tw-desk" aria-label="打字机练习区">
          <div className="tw-desk-status"><span><i className={focused ? "active" : ""} />{phase === "sent" ? "本次练习已寄出" : composing ? "正在选字" : focused ? "打字机已就绪" : "点击信纸，开始誊写"}</span><span>{isFree ? "自由信笺" : languageOption.label}</span></div>
          <div className={`tw-machine ${focused ? "is-focused" : ""} ${returning ? "is-returning" : ""} ${phase}`}>
            <div className="tw-paper-path">
              <article className="tw-paper" key={paperVersion} ref={paperRef} lang={isFree ? undefined : language}>
                <div className="tw-paper-top"><span>C.H. POSTAL</span><span>{isFree ? "YOUR OWN LETTER" : "LETTER / 01"}</span></div>
                <div className="tw-letter-meta"><h2>{salutation}</h2></div>
                <div className="tw-writing-area">
                  <div className="tw-text-display" ref={bodyRef} aria-hidden="true">
                    {isFree ? <>{committed ? <span className="tw-char correct">{committed}</span> : <span className="tw-free-placeholder">开始输入</span>}<span ref={cursorRef} className="tw-end-cursor" /></> : <>{result.expected.map((char: string, index: number) => {
                      const actual = result.actual[index];
                      return <span key={index} ref={index === result.actual.length ? cursorRef : undefined} className={`tw-char ${actual === undefined ? "pending" : actual === char ? "correct" : "incorrect"} ${index === result.actual.length ? "cursor" : ""}`} title={actual !== undefined && actual !== char ? `应为「${char}」，输入了「${actual}」` : undefined}>{actual ?? char}</span>;
                    })}
                    {result.actual.slice(result.expected.length).map((char: string, index: number) => <span className="tw-char incorrect" key={`extra-${index}`}>{char}</span>)}
                    {result.actual.length >= result.expected.length && <span ref={cursorRef} className="tw-end-cursor" />}</>}
                  </div>
                  <textarea ref={inputRef} className="tw-input" aria-label={isFree ? "自由信笺输入" : languageOption.inputLabel} aria-describedby="practice-feedback" value={draft} spellCheck={false} autoComplete="off" autoCapitalize="off" aria-invalid={!isFree && result.errors > 0} onBeforeInput={(event) => { if (!isFree && (event.nativeEvent as InputEvent).inputType === "insertFromPaste") event.preventDefault(); }} disabled={phase !== "writing"} onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); setPressed([]); }} onKeyDown={onKeyDown} onKeyUp={(event) => releaseKey(SPECIAL_CODES[event.code] ?? event.code.replace(/^Key|^Digit/, ""))} onChange={(event) => { const value = isFree ? event.target.value : event.target.value.replace(/\r?\n/g, ""); setDraft(value); if (!imeRef.current && !(event.nativeEvent as InputEvent).isComposing) commit(value); }} onCompositionStart={() => { imeRef.current = true; setComposing(true); }} onCompositionUpdate={(event) => setPreedit(event.data)} onCompositionEnd={(event) => { imeRef.current = false; setComposing(false); setPreedit(""); commit(isFree ? event.currentTarget.value : event.currentTarget.value.replace(/\r?\n/g, "")); }} onScroll={(event) => { if (bodyRef.current) bodyRef.current.scrollTop = event.currentTarget.scrollTop; }} onPaste={(event) => { if (isFree) return; event.preventDefault(); setNotice("练习模式不支持粘贴。"); }} onDrop={(event) => event.preventDefault()} />
                </div>
                <div className="tw-paper-sign">{sender}</div>
                <div className="tw-input-hint" aria-live="polite">{composing ? `正在选字：${preedit || "…"}` : ""}</div>
              </article>
            </div>

            <div className="tw-carriage" style={{ "--carriage-step": `${-Math.min(result.actual.length % 22, 21) * 0.55}px` } as CSSProperties} aria-hidden="true">
              <div className="tw-return-lever" /><div className="tw-platen-knob left" /><div className="tw-platen" /><div className="tw-platen-knob right" /><div className="tw-paper-bail" /><div className="tw-ruler">{Array.from({ length: 11 }, (_, i) => <span key={i}>{i * 10}</span>)}</div>
            </div>
            <div className="tw-machine-body">
              <div className="tw-mechanism" aria-hidden="true">
                <div className="tw-ribbon" />
                <div className="tw-spool left" style={{ transform: `rotate(${stroke * 8}deg)` }}><i /><i /><b /></div>
                <div className="tw-type-basket">{Array.from({ length: 23 }, (_, i) => <i key={i} style={{ "--bar": i } as CSSProperties} />)}<span className={stroke ? "tw-striker striking" : "tw-striker"} key={stroke} /></div>
                <div className="tw-spool right" style={{ transform: `rotate(${stroke * 8}deg)` }}><i /><i /><b /></div>
              </div>
              <div className="tw-machine-name" aria-hidden="true"><span>C.H.</span><strong>Underwood</strong><span>PORTABLE</span></div>
              <div className="tw-keyboard" aria-hidden="true">
                {KEY_ROWS.map((row, index) => <div className={`tw-key-row row-${index}`} key={index}>{row.map((key) => <button type="button" tabIndex={-1} className={`tw-key ${key.length > 1 ? "function-key" : ""} ${pressed.includes(key) ? "is-down" : ""}`} key={key} disabled={phase !== "writing"} onPointerDown={(event) => { event.preventDefault(); inputRef.current?.focus({ preventScroll: true }); pressKey(key); releaseKey(key); }}><span>{displayKey(key)}</span></button>)}</div>)}
                <div className="tw-space-row"><span>SHIFT LOCK</span><button type="button" tabIndex={-1} disabled={phase !== "writing"} className={`tw-space ${pressed.includes("Space") ? "is-down" : ""}`} onPointerDown={(event) => { event.preventDefault(); inputRef.current?.focus({ preventScroll: true }); pressKey("Space"); releaseKey("Space"); }} /><span /></div>
              </div>
              <div className="tw-machine-foot left" /><div className="tw-machine-foot right" />
            </div>
          </div>

          <div className="tw-practice-footer">
            {isFree ? <div className="tw-progress-section"><div className="tw-progress-copy"><span>已写下 <b>{Array.from(committed).length}</b> / 2000 字</span><span>自由书写</span></div><div className="tw-progress-track"><i style={{ width: `${Array.from(committed).length / 20}%` }} /></div></div> : <div className="tw-progress-section"><div className="tw-progress-copy"><span>誊写进度 <b>{result.correct}</b> / {result.expected.length}</span><span>{result.errors ? <em>{result.errors} 处需修改</em> : result.complete ? "誊写完成" : ""}</span></div><div className="tw-progress-track" role="progressbar" aria-label="誊写进度" aria-valuenow={result.correct} aria-valuemin={0} aria-valuemax={result.expected.length}><i style={{ width: `${result.progress}%` }} /></div></div>}
            <button type="button" className="tw-send" disabled={!canSend} onClick={sendLetter}><span aria-hidden="true">✉</span>{phase === "sent" ? "信件已寄出" : phase === "ejecting" ? "正在封缄" : "封缄并寄信"}</button>
          </div>
          <p className="tw-feedback" id="practice-feedback" role="status">{notice || (sound.unavailable ? "此浏览器暂时无法播放音效，仍可继续练习。" : !isFree && result.errors ? "请修改红字。" : "")}</p>
          {phase === "sent" && delivery === "idle" && <div className="tw-receipt" id="practice-receipt" tabIndex={-1}><div><strong>信件已寄出</strong></div><div className="tw-receipt-actions">{exportState === "ready" && exportUrl ? <a className="tw-download" href={exportUrl} download={`violet-${isFree ? "free-letter" : `${letter.id}-${language}`}.png`}>↓ 保存信件图片</a> : <button type="button" disabled={exportState === "generating"} onClick={() => void generateExport()}>{exportState === "error" ? "重新生成信件图片" : "正在生成信件图片…"}</button>}<button type="button" onClick={() => requestReset("restart")}>{isFree ? "再写一封 →" : "重新练习 →"}</button></div></div>}
        </section>
      </div>

      <LetterDeliveryFlight state={delivery} deliveredTitle="信件已寄出" deliveredLabel="" />
      <dialog className="tw-dialog" ref={dialogRef} onCancel={() => setPendingAction(null)}><h2>换一张新的信纸？</h2><p>当前输入会清空。</p><div><button type="button" onClick={() => setPendingAction(null)}>继续写这一封</button><button type="button" onClick={() => performReset(pendingAction ?? "restart")}>换新信纸</button></div></dialog>
    </main>
  );
}
