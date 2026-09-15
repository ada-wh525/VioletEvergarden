import assert from "node:assert/strict";
import test from "node:test";
import { readFile, mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import ts from "typescript";
import { Window } from "happy-dom";
import { comparePractice } from "../lib/typewriter/practice.mjs";

const rootPath = new URL("../", import.meta.url).pathname;
await mkdir(join(rootPath, "work"), { recursive: true });
const temporary = await mkdtemp(join(rootPath, "work", "typewriter-test-"));
const sources = ["app/typewriter/page.tsx", "lib/typewriter/letters.ts", "lib/typewriter/use-typewriter-sound.ts", "lib/letter-keepsake.ts", "components/letter-delivery-flight.tsx"];
const names = Object.fromEntries(sources.map((source, i) => [source, `module-${i}.mjs`]));
for (const source of sources) {
  let text = await readFile(join(rootPath, source), "utf8");
  text = text.replace(/import Link from "next\/link";/, 'const Link = ({ children, ...props }) => <a {...props}>{children}</a>;');
  text = text.replace(/import "\.\/typewriter\.css";/, "");
  text = text.replace(/from "(\.\.[^"]+)"/g, (original, relative) => {
    const absolute = new URL(relative, new URL(source, `file://${rootPath}`)).pathname;
    const key = sources.find((candidate) => join(rootPath, candidate).replace(/\.(tsx|ts)$/, "") === absolute);
    return key ? `from "./${names[key]}"` : `from "${absolute}"`;
  });
  const output = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  await writeFile(join(temporary, names[source]), output);
}

// DOM component tests exercise React's real event handlers. These are not browser/IME visual QA.
const window = new Window({ url: "http://localhost/typewriter" });
for (const name of ["window", "document", "HTMLElement", "HTMLTextAreaElement", "Event", "InputEvent", "KeyboardEvent", "CompositionEvent", "MouseEvent"]) {
  globalThis[name] = name === "window" ? window : window[name];
}
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.getComputedStyle = (element) => ({ fontFamily: '"Noto Sans SC", sans-serif', getPropertyValue: (name) => element.style.getPropertyValue(name) });
Object.defineProperty(document, "fonts", { value: { ready: Promise.resolve() } });
window.matchMedia = () => ({ matches: true });
const drawn = [];
window.HTMLCanvasElement.prototype.getContext = function () {
  return new Proxy({
    measureText: (text) => ({ width: Array.from(text).length * 34 }),
    fillText: (text, x, y) => drawn.push({ text, x, y, canvas: this }),
    createRadialGradient: () => ({ addColorStop() {} }),
  }, { get: (target, name) => target[name] ?? (() => {}) });
};
window.HTMLCanvasElement.prototype.toBlob = function (callback) { callback(new Blob(["test image"], { type: "image/png" })); };
let audioEvents = 0;
class AudioContextStub {
  currentTime = 0; sampleRate = 8000; state = "running"; destination = {};
  createGain() { return { gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} }, connect() { return this; }, disconnect() {} }; }
  createBuffer(_channels, length) { return { getChannelData: () => new Float32Array(length) }; }
  createBufferSource() { return { connect() { return this; }, disconnect() {}, start() { audioEvents++; }, stop() {} }; }
  createBiquadFilter() { return { frequency: {}, Q: {}, connect() { return this; }, disconnect() {} }; }
  createOscillator() { return { frequency: { setValueAtTime() {} }, connect() { return this; }, disconnect() {}, start() { audioEvents++; }, stop() {} }; }
  close() { return Promise.resolve(); }
}
globalThis.AudioContext = AudioContextStub;
const { createElement, act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { default: Page } = await import(join(temporary, names["app/typewriter/page.tsx"]));
const { PRACTICE_LETTERS } = await import(join(temporary, names["lib/typewriter/letters.ts"]));
const { createLetterKeepsake } = await import(join(temporary, names["lib/letter-keepsake.ts"]));
const container = document.createElement("div");
document.body.append(container);
const root = createRoot(container);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const button = (text) => [...container.querySelectorAll("button")].find((item) => item.textContent.includes(text));
const setValue = (element, value) => Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set.call(element, value);
async function type(value, { composing = false } = {}) {
  await act(async () => {
    const input = container.querySelector("textarea");
    setValue(input, value);
    input.dispatchEvent(new window.InputEvent("input", { bubbles: true, inputType: composing ? "insertCompositionText" : "insertText", isComposing: composing }));
    await wait(5);
  });
}
async function click(text) { await act(async () => { button(text).click(); await wait(10); }); }

await test("Unicode matching counts correct, wrong, extra, and corrected characters", () => {
  assert.equal(comparePractice("今天，你好。", "今天").correct, 2);
  assert.equal(comparePractice("今天，你好。", "今夭").errors, 1);
  assert.equal(comparePractice("今天，你好。", "今天，你好。错").complete, false);
  assert.equal(comparePractice("今天，你好。", "今天，你好。").complete, true);
  assert.equal(comparePractice("𠮷é", "𠮷e\u0301").correct, 2);
});

await test("composition stays ungraded until committed, mistakes block sending, keyboard and mute respond", async () => {
  await act(async () => root.render(createElement(Page)));
  const input = container.querySelector("textarea");
  assert.equal(button("封缄并寄信").disabled, true);
  await act(async () => input.focus());
  await act(async () => input.dispatchEvent(new window.CompositionEvent("compositionstart", { bubbles: true })));
  await type("nin", { composing: true });
  assert.equal(container.querySelectorAll(".tw-char.correct").length, 0);
  assert.equal(container.querySelectorAll(".tw-char.incorrect").length, 0);
  await act(async () => {
    setValue(input, "您");
    input.dispatchEvent(new window.CompositionEvent("compositionend", { bubbles: true, data: "您" }));
    input.dispatchEvent(new window.InputEvent("input", { bubbles: true, isComposing: false }));
    await wait(5);
  });
  assert.equal(container.querySelectorAll(".tw-char.correct").length, 1);
  await type("您进");
  assert.equal(container.querySelectorAll(".tw-char.incorrect").length, 1);
  assert.equal(button("封缄并寄信").disabled, true);
  await type("您近");
  assert.equal(container.querySelectorAll(".tw-char.incorrect").length, 0);
  assert.equal(container.querySelectorAll(".tw-char.correct").length, 2);
  await act(async () => input.dispatchEvent(new window.KeyboardEvent("keydown", { bubbles: true, key: "q", code: "KeyQ" })));
  assert.equal(container.querySelector(".tw-key.is-down")?.textContent, "Q");
  assert.ok(audioEvents > 0);
  await act(async () => { input.dispatchEvent(new window.KeyboardEvent("keyup", { bubbles: true, key: "q", code: "KeyQ" })); await wait(100); });
  assert.equal(container.querySelector(".tw-key.is-down"), null);
  await click("机械音效已开启");
  const before = audioEvents;
  await act(async () => input.dispatchEvent(new window.KeyboardEvent("keydown", { bubbles: true, key: "w", code: "KeyW" })));
  assert.equal(audioEvents, before);
});

await test("complete practice sends a letter and exposes its image download; changing a draft asks first", async () => {
  await click("空白打字室");
  assert.ok(container.querySelector("dialog").open);
  await click("继续写这一封");
  assert.equal(container.querySelector("textarea").value, "您近");
  await type(PRACTICE_LETTERS[0].versions.zh.body);
  assert.equal(button("封缄并寄信").disabled, false);
  await click("封缄并寄信");
  assert.equal(container.querySelector("textarea").disabled, true);
  for (let i = 0; i < 4; i++) await act(async () => { await wait(200); });
  assert.ok(container.querySelector("#practice-receipt"));
  const download = container.querySelector("a[download]");
  assert.match(download?.getAttribute("href") ?? "", /^blob:/);
  assert.equal(download?.getAttribute("download"), "violet-major-zh.png");
});

await test("blank room accepts multilingual text and newlines, rejects whitespace-only sending, then exports", async () => {
  await click("空白打字室");
  assert.equal(container.querySelector("textarea").getAttribute("aria-label"), "自由信笺输入");
  await type(" \n ");
  assert.equal(button("封缄并寄信").disabled, true);
  const text = "亲爱的朋友：\nHello, Violet!\n日本語も、한국어도。 🌸";
  await type(text);
  assert.equal(container.querySelector("textarea").value, text);
  assert.equal(container.querySelectorAll(".tw-char.incorrect").length, 0);
  assert.equal(button("封缄并寄信").disabled, false);
  await click("封缄并寄信");
  for (let i = 0; i < 4; i++) await act(async () => { await wait(200); });
  assert.equal(container.querySelector("a[download]")?.getAttribute("download"), "violet-free-letter.png");
});

await test("the single supplied letter switches languages, guards drafts and exports the selected text", async () => {
  await click("经典信件练习");
  assert.equal(PRACTICE_LETTERS.length, 1);
  assert.equal(container.querySelector(".tw-paper-sign").textContent, "薇尔莉特");
  assert.doesNotMatch(container.textContent, /给初次坐下的你|没有底稿，也没有标准答案|取意于|本站原创练习稿|机械外观参考|让未曾说出口的心意/);
  await type("您近");
  await click("日本語");
  assert.equal(container.querySelector("dialog").open, true);
  await click("继续写这一封");
  assert.equal(container.querySelector("textarea").value, "您近");
  await click("日本語");
  await click("换新信纸");
  assert.equal(container.querySelector("textarea").value, "");
  assert.equal(container.querySelector("textarea").getAttribute("aria-label"), "日文打字练习输入");
  const input = container.querySelector("textarea");
  await act(async () => input.dispatchEvent(new window.CompositionEvent("compositionstart", { bubbles: true })));
  await type("ogenki", { composing: true });
  assert.equal(container.querySelectorAll(".incorrect").length, 0);
  await act(async () => {
    setValue(input, "お元気");
    input.dispatchEvent(new window.CompositionEvent("compositionend", { bubbles: true, data: "お元気" }));
  });
  assert.equal(container.querySelectorAll(".tw-char.correct").length, 3);
  await type(PRACTICE_LETTERS[0].versions.ja.body);
  assert.equal(button("封缄并寄信").disabled, false);
  await click("English");
  await click("换新信纸");
  assert.equal(container.querySelector(".tw-letter-meta h2").textContent, "Dear Major Gilbert,");
  await type("How have you ");
  assert.equal(container.querySelectorAll(".incorrect").length, 0);
  assert.equal(button("封缄并寄信").disabled, true);
  await type(PRACTICE_LETTERS[0].versions.en.body);
  const start = drawn.length;
  await click("封缄并寄信");
  for (let i = 0; i < 4; i++) await act(async () => { await wait(200); });
  assert.equal(container.querySelector("a[download]").getAttribute("download"), "violet-major-en.png");
  assert.ok(drawn.slice(start).some((call) => call.text === "Dear Major Gilbert,"));
  assert.ok(drawn.slice(start).some((call) => call.text === "薇尔莉特"));
  assert.ok(!drawn.slice(start).some((call) => /本站原创|非小说原文/.test(call.text)));
});

await test("shared exporter keeps all long-letter lines and the homepage's default salutation", async () => {
  const start = drawn.length;
  const section = document.createElement("section");
  const preview = document.createElement("article");
  const text = Array.from({ length: 45 }, (_, index) => `第${index + 1}行：这是完整保留的信件内容。`).join("\n");
  const blob = await createLetterKeepsake({ text, author: "测试署名", section, preview, themeLabel: "测试信纸" });
  assert.equal(blob.type, "image/png");
  const calls = drawn.slice(start);
  assert.ok(calls.some((call) => call.text === "Dear Violet,"));
  assert.ok(calls.some((call) => call.text.includes("第45行")));
  assert.ok(calls.every((call) => call.y < call.canvas.height));
  assert.ok(calls[0].canvas.height > 1600);
});

await act(async () => root.unmount());
await window.happyDOM.close();
await rm(temporary, { recursive: true, force: true });
