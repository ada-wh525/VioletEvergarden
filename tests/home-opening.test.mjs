import assert from "node:assert/strict";
import test from "node:test";
import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import ts from "typescript";
import { Window } from "happy-dom";

const project = new URL("../", import.meta.url).pathname;
await mkdir(join(project, "work"), { recursive: true });
const directory = await mkdtemp(join(project, "work", "opening-test-"));
for (const [sourcePath, name] of [["lib/home-drawing/path.ts", "path"], ["lib/home-drawing/camera.ts", "camera"], ["lib/home-drawing/renderer.ts", "renderer"], ["lib/home-drawing/spots.ts", "spots"], ["lib/home-drawing/portrait.ts", "portrait"], ["lib/home-drawing/releases.ts", "releases"], ["lib/home-drawing/playback.ts", "playback"], ["components/home-opening.tsx", "opening"]]) {
  let source = await readFile(join(project, sourcePath), "utf8");
  if (name === "path") {
    source = source.replace("import svgRaw from './violet-one-stroke.svg?raw';", `const svgRaw = ${JSON.stringify(await readFile(join(project, "lib/home-drawing/violet-one-stroke.svg"), "utf8"))};`)
      .replace("import route from './violet-one-stroke.json';", `const route = ${await readFile(join(project, "lib/home-drawing/violet-one-stroke.json"), "utf8")};`);
  }
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText
    .replace(/(['"])(?:\.\.\/lib\/home-drawing\/|\.\/)(path|camera|renderer|spots|portrait|releases|playback)\1/g, '"./$2.mjs"');
  await writeFile(join(directory, `${name}.mjs`), output);
}
const modulePath = join(directory, "opening.mjs");

const window = new Window({ url: "http://localhost/" });
for (const name of ["document", "HTMLElement", "KeyboardEvent", "Event", "sessionStorage", "location"]) globalThis[name] = window[name];
globalThis.window = window;
globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.matchMedia = () => ({ matches: false });
const contexts = new WeakMap();
window.HTMLCanvasElement.prototype.getContext = function (type) {
  assert.equal(type, "2d");
  if (!contexts.has(this)) {
    contexts.set(this, {
      path: [], strokes: [], fills: [], globalAlpha: 1,
      setTransform() {}, translate() {},
      clearRect() { this.strokes = []; this.fills = []; },
      beginPath() { this.path = []; },
      moveTo(...values) { this.path.push(["M", ...values]); },
      bezierCurveTo(...values) { this.path.push(["C", ...values]); },
      arc(...values) { this.path.push(["arc", ...values]); },
      closePath() { this.path.push(["Z"]); },
      stroke() { this.strokes.push(this.path.slice()); },
      fill() { this.fills.push({ path: this.path.slice(), alpha: this.globalAlpha }); },
      createRadialGradient() { return { addColorStop() {} }; },
    });
  }
  return contexts.get(this);
};
const frames = new Map();
let frameId = 0;
window.requestAnimationFrame = (callback) => { frames.set(++frameId, callback); return frameId; };
window.cancelAnimationFrame = (id) => frames.delete(id);
async function tick(timestamp) {
  const callbacks = [...frames.values()];
  frames.clear();
  await act(async () => callbacks.forEach((callback) => callback(timestamp)));
}

const { createElement, act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { HomeOpening } = await import(modulePath);
const { PLAYBACK_DURATION, PLAYBACK_SEGMENTS, drawingTimeAt } = await import(join(directory, "playback.mjs"));
const { buildStroke } = await import(join(directory, "path.mjs"));
const container = document.createElement("div");
const main = document.createElement("main");
main.innerHTML = '<section id="top"><div class="hero-visual"><div class="hero-portrait-frame"></div></div><h1 tabindex="-1">薇尔莉特</h1></section>';
main.querySelector(".hero-portrait-frame").getBoundingClientRect = () => ({ left: 0, top: 78, width: 700, height: 822 });
let arrivalFrames;
let arrivalOptions;
window.HTMLElement.prototype.animate = (keyframes, options) => {
  arrivalOptions = options;
  arrivalFrames = keyframes;
  return { cancel() {} };
};
document.body.append(container, main);
let root = createRoot(container);

test("each release lasts four seconds while other drawing runs ten percent faster", () => {
  let wallTime = 0;
  for (const segment of PLAYBACK_SEGMENTS) {
    assert.ok(Math.abs(drawingTimeAt(wallTime) - segment.from) < 1e-7);
    const midpoint = wallTime + segment.duration / 2;
    assert.ok(Math.abs(drawingTimeAt(midpoint) - (segment.from + segment.to) / 2) < 1e-7);
    wallTime += segment.duration;
  }
  assert.equal(PLAYBACK_SEGMENTS.filter(s => s.reading).length, 4);
  assert.ok(PLAYBACK_SEGMENTS.filter(s => s.reading).every(s => Math.abs(s.duration - 4000) < 1e-8));
  assert.ok(PLAYBACK_SEGMENTS.slice(1).filter(s => !s.reading).every(s => s.speed === 1.1));
  assert.equal(drawingTimeAt(PLAYBACK_DURATION + 1000), 30150);
});

async function completeSkippedArrival() {
  await tick(0);
  await tick(200);
  const scene = container.querySelector(".home-opening");
  assert.ok(scene.classList.contains("is-arriving"));
  const event = new window.Event("animationend", { bubbles: true });
  Object.defineProperty(event, "animationName", { value: "home-opening-exit" });
  await act(async () => scene.dispatchEvent(event));
}

test("first visit draws a portrait, then skip restores focus and remembers the visit", async () => {
  await act(async () => root.render(createElement(HomeOpening)));
  assert.equal(container.querySelector('[role="dialog"]')?.getAttribute("aria-label"), "人物绘画入场");
  assert.equal(container.querySelectorAll("canvas").length, 2);
  assert.ok(container.querySelector(".home-opening__pointer svg"));
  assert.equal(container.querySelector(".home-opening__pause"), null);
  assert.equal(contexts.get(container.querySelector(".home-opening__ink")).strokes.length, 0);
  assert.equal(container.querySelector(".home-opening__knife"), null);
  assert.equal(container.querySelector(".home-opening__stationery"), null);
  assert.equal(document.activeElement, container.querySelector(".home-opening"));
  assert.ok(main.hasAttribute("inert"));
  assert.equal(document.body.style.overflow, "hidden");

  await act(async () => container.querySelector(".home-opening__skip").click());
  assert.ok(container.querySelector(".home-opening"));
  assert.ok(main.hasAttribute("inert"));
  assert.equal(contexts.get(container.querySelector(".home-opening__ink")).strokes[0].filter(([command]) => command === "C").length, 697);
  assert.equal(container.querySelector(".home-opening__skip").disabled, true);
  await completeSkippedArrival();
  assert.equal(container.querySelector(".home-opening"), null);
  assert.equal(main.hasAttribute("inert"), false);
  assert.equal(document.body.style.overflow, "");
  assert.equal(frames.size, 0);
  assert.equal(sessionStorage.getItem("violet-home-drawing-v3-viewed"), "1");
  await act(async () => new Promise((resolve) => setTimeout(resolve, 5)));
  assert.equal(document.activeElement?.textContent, "薇尔莉特");

  await act(async () => root.unmount());
  root = createRoot(container);
  await act(async () => root.render(createElement(HomeOpening)));
  assert.equal(container.querySelector(".home-opening"), null);
  assert.equal(main.hasAttribute("inert"), false);
});

test("normal completion and reduced-motion visits leave the page usable", async () => {
  await act(async () => root.unmount());
  root = createRoot(container);
  sessionStorage.clear();
  document.documentElement.classList.remove("home-opening-seen");
  await act(async () => root.render(createElement(HomeOpening)));
  await tick(0);
  await tick(4200);
  assert.equal(container.querySelector(".home-opening").classList.contains("is-arriving"), false);
  assert.equal(contexts.get(container.querySelector(".home-opening__ink")).strokes[0].filter(([command]) => command === "M").length, 1);
  await tick(PLAYBACK_DURATION + 1);
  const scene = container.querySelector(".home-opening");
  assert.ok(scene.classList.contains("is-arriving"));
  assert.ok(document.documentElement.classList.contains("home-opening-arriving"));
  assert.equal(arrivalOptions.duration, 2400);
  assert.equal(scene.style.getPropertyValue("--opening-arrival-duration"), "2400ms");
  const painted = contexts.get(container.querySelector(".home-opening__ink")).strokes[0];
  assert.equal(painted.filter(([command]) => command === "C").length, 697);
  const end = painted.at(-1).slice(-2);
  const stroke = buildStroke();
  assert.deepEqual(end, [stroke.end.x, stroke.end.y]);
  assert.ok(painted.every(([, ...values]) => values.every(Number.isFinite)));
  assert.ok(contexts.get(container.querySelector(".home-opening__glow")).fills.some(({ path, alpha }) => alpha === 1 && path.filter(([command]) => command === "C").length === 4));
  const portraitScale = 822 / 1448;
  assert.equal(parseFloat(arrivalFrames[1].width), 1086 * portraitScale);
  assert.equal(parseFloat(arrivalFrames[1].left), (700 - 1086 * portraitScale) / 2);
  assert.equal(arrivalFrames[1].top, "78px");
  // The canvas artboard corners must land on the same object-fit rectangle.
  const { buildCamera } = await import(join(directory, "camera.mjs"));
  const { timeAt } = await import(join(directory, "path.mjs"));
  const camera = buildCamera(stroke, { w: window.innerWidth, h: window.innerHeight, u0: timeAt(512 / stroke.length), anchor: { x: window.innerWidth * .38, y: window.innerHeight * .64 } });
  const cam = camera.at(1);
  const matrix = scene.style.getPropertyValue("--drawing-end").match(/-?[\d.]+/g).map(Number);
  const screenX = window.innerWidth / 2 - cam.x * cam.k;
  const screenY = window.innerHeight / 2 - cam.y * cam.k;
  assert.ok(Math.abs(screenX * matrix[0] + matrix[4] - parseFloat(arrivalFrames[1].left)) < 1e-8);
  assert.ok(Math.abs(screenY * matrix[3] + matrix[5] - 78) < 1e-8);
  assert.ok(Math.abs(1086 * cam.k * matrix[0] - parseFloat(arrivalFrames[1].width)) < 1e-8);
  const childEvent = new window.Event("animationend", { bubbles: true });
  Object.defineProperty(childEvent, "animationName", { value: "home-opening-exit" });
  await act(async () => container.querySelector(".home-opening__drawing").dispatchEvent(childEvent));
  assert.ok(container.querySelector(".home-opening"));
  const event = new window.Event("animationend", { bubbles: true });
  Object.defineProperty(event, "animationName", { value: "home-opening-exit" });
  await act(async () => scene.dispatchEvent(event));
  assert.equal(document.documentElement.classList.contains("home-opening-arriving"), false);
  assert.equal(container.querySelector(".home-opening"), null);
  assert.equal(main.hasAttribute("inert"), false);

  await act(async () => root.unmount());
  root = createRoot(container);
  sessionStorage.clear();
  window.matchMedia = () => ({ matches: true });
  await act(async () => root.render(createElement(HomeOpening)));
  assert.equal(container.querySelector(".home-opening"), null);
  assert.equal(main.hasAttribute("inert"), false);
  await act(async () => root.unmount());
});

test("preview replays the original drawing without clearing the session", async () => {
  sessionStorage.setItem("violet-home-drawing-v3-viewed", "1");
  document.documentElement.classList.add("home-opening-seen");
  window.matchMedia = () => ({ matches: false });
  window.history.replaceState(null, "", "/?opening=1");
  root = createRoot(container);
  await act(async () => root.render(createElement(HomeOpening)));
  assert.ok(container.querySelector(".home-opening"));
  assert.equal(document.documentElement.classList.contains("home-opening-seen"), false);
  await tick(0);
  await tick(4200);
  assert.equal(contexts.get(container.querySelector(".home-opening__ink")).strokes[0].filter(([command]) => command === "M").length, 1);
  await act(async () => container.querySelector(".home-opening__skip").click());
  assert.ok(container.querySelector(".home-opening"));
  assert.ok(main.hasAttribute("inert"));
  assert.equal(contexts.get(container.querySelector(".home-opening__ink")).strokes[0].filter(([command]) => command === "C").length, 697);
  assert.equal(container.querySelector(".home-opening__skip").disabled, true);
  await completeSkippedArrival();
  assert.equal(main.hasAttribute("inert"), false);
  await act(async () => root.unmount());
});

test("release cards follow the drawing, pause preserves progress, and Escape releases the page", async () => {
  sessionStorage.clear();
  root = createRoot(container);
  await act(async () => root.render(createElement(HomeOpening)));
  await tick(0);
  // Real frame cadence leaves a visible scrub lag before pausing.
  for (let time = 100; time <= 6000; time += 100) await tick(time);
  const releases = [...container.querySelectorAll(".home-opening__release")];
  assert.equal(releases.length, 4);
  assert.equal(releases[0].getAttribute("aria-hidden"), "false");
  assert.ok(releases[0].textContent.includes("2015.12.25"));
  assert.equal(releases[1].getAttribute("aria-hidden"), "true");
  const before = JSON.stringify(contexts.get(container.querySelector(".home-opening__ink")).strokes);
  await act(async () => container.querySelector(".home-opening").click());
  assert.match(container.querySelector(".pointer-word").textContent, /已暂停/);
  await tick(6300);
  const easing = JSON.stringify(contexts.get(container.querySelector(".home-opening__ink")).strokes);
  assert.notEqual(easing, before);
  await tick(6900);
  const stopped = JSON.stringify(contexts.get(container.querySelector(".home-opening__ink")).strokes);
  assert.notEqual(stopped, easing);
  await tick(16000);
  assert.equal(JSON.stringify(contexts.get(container.querySelector(".home-opening__ink")).strokes), stopped);
  await act(async () => container.querySelector(".home-opening").click());
  assert.match(container.querySelector(".pointer-word").textContent, /播放中/);
  await tick(20500);
  assert.equal(releases[0].getAttribute("aria-hidden"), "true");
  assert.equal(releases[1].getAttribute("aria-hidden"), "false");
  const scene = container.querySelector(".home-opening");
  await act(async () => scene.dispatchEvent(new window.KeyboardEvent("keydown", { key: " ", bubbles: true })));
  assert.match(container.querySelector(".pointer-word").textContent, /已暂停/);
  await act(async () => scene.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
  assert.match(container.querySelector(".pointer-word").textContent, /播放中/);
  await act(async () => scene.dispatchEvent(new window.PointerEvent("pointermove", { pointerType: "mouse", clientX: window.innerWidth - 20, clientY: 200, bubbles: true })));
  assert.ok(container.querySelector(".home-opening__pointer").classList.contains("is-flipped"));
  await act(async () => document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape" })));
  assert.equal(main.hasAttribute("inert"), false);
  assert.equal(document.body.style.overflow, "");
  assert.equal(container.querySelector(".home-opening"), null);
  await act(async () => root.unmount());
});

test("unavailable Canvas leaves the homepage accessible", async () => {
  const getContext = window.HTMLCanvasElement.prototype.getContext;
  window.HTMLCanvasElement.prototype.getContext = () => null;
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
  root = createRoot(container);
  try {
    await act(async () => root.render(createElement(HomeOpening)));
    assert.equal(container.querySelector(".home-opening"), null);
    assert.equal(main.hasAttribute("inert"), false);
    assert.equal(document.body.style.overflow, "");
    assert.equal(frames.size, 0);
  } finally {
    await act(async () => root.unmount());
    window.HTMLCanvasElement.prototype.getContext = getContext;
  }
});

test.after(() => rm(directory, { recursive: true, force: true }));
