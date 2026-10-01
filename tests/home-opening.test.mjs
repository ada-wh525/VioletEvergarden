import assert from "node:assert/strict";
import test from "node:test";
import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import ts from "typescript";
import { Window } from "happy-dom";

const project = new URL("../", import.meta.url).pathname;
await mkdir(join(project, "work"), { recursive: true });
const directory = await mkdtemp(join(project, "work", "opening-test-"));
for (const [sourcePath, name] of [["lib/home-drawing/path.ts", "path"], ["lib/home-drawing/camera.ts", "camera"], ["lib/home-drawing/renderer.ts", "renderer"], ["lib/home-drawing/parallel.ts", "parallel"], ["components/home-opening.tsx", "opening"]]) {
  let source = await readFile(join(project, sourcePath), "utf8");
  if (name === "path") {
    source = source.replace("import svgRaw from './violet-one-stroke.svg?raw';", `const svgRaw = ${JSON.stringify(await readFile(join(project, "lib/home-drawing/violet-one-stroke.svg"), "utf8"))};`)
      .replace("import route from './violet-one-stroke.json';", `const route = ${await readFile(join(project, "lib/home-drawing/violet-one-stroke.json"), "utf8")};`);
  }
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText
    .replace(/(['"])(?:\.\.\/lib\/home-drawing\/|\.\/)(path|camera|renderer|parallel)\1/g, '"./$2.mjs"');
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
const { buildStroke } = await import(join(directory, "path.mjs"));
const container = document.createElement("div");
const main = document.createElement("main");
main.innerHTML = '<section id="top"><div class="hero-visual"></div><h1 tabindex="-1">薇尔莉特</h1></section>';
main.querySelector(".hero-visual").getBoundingClientRect = () => ({ left: 0, top: 78, width: 700, height: 822 });
let arrivalFrames;
window.HTMLElement.prototype.animate = (keyframes) => {
  arrivalFrames = keyframes;
  return { cancel() {} };
};
document.body.append(container, main);
let root = createRoot(container);

test("first visit draws a portrait, then skip restores focus and remembers the visit", async () => {
  await act(async () => root.render(createElement(HomeOpening)));
  assert.equal(container.querySelector('[role="dialog"]')?.getAttribute("aria-label"), "人物绘画入场");
  assert.equal(container.querySelectorAll("canvas").length, 2);
  assert.equal(container.querySelector("svg"), null);
  assert.equal(contexts.get(container.querySelector(".home-opening__ink")).strokes.length, 0);
  assert.equal(container.querySelector(".home-opening__knife"), null);
  assert.equal(container.querySelector(".home-opening__stationery"), null);
  assert.equal(document.activeElement?.textContent?.trim(), "跳过 ↗");
  assert.ok(main.hasAttribute("inert"));
  assert.equal(document.body.style.overflow, "hidden");

  await act(async () => container.querySelector("button").click());
  assert.equal(container.querySelector(".home-opening"), null);
  assert.equal(main.hasAttribute("inert"), false);
  assert.equal(document.body.style.overflow, "");
  assert.equal(frames.size, 0);
  assert.equal(sessionStorage.getItem("violet-home-drawing-v2-viewed"), "1");
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
  assert.equal(contexts.get(container.querySelector(".home-opening__ink")).strokes[0].filter(([command]) => command === "M").length, 3);
  await tick(11000);
  const scene = container.querySelector(".home-opening");
  assert.ok(scene.classList.contains("is-arriving"));
  const painted = contexts.get(container.querySelector(".home-opening__ink")).strokes[0];
  assert.equal(painted.filter(([command]) => command === "C").length, 697);
  const end = painted.at(-1).slice(-2);
  const stroke = buildStroke();
  assert.deepEqual(end, [stroke.end.x, stroke.end.y]);
  assert.ok(painted.every(([, ...values]) => values.every(Number.isFinite)));
  assert.ok(contexts.get(container.querySelector(".home-opening__glow")).fills.some(({ path, alpha }) => alpha === 1 && path.filter(([command]) => command === "C").length === 4));
  assert.equal(arrivalFrames[1].left, "0px");
  assert.equal(arrivalFrames[1].width, "700px");
  const childEvent = new window.Event("animationend", { bubbles: true });
  Object.defineProperty(childEvent, "animationName", { value: "home-opening-exit" });
  await act(async () => container.querySelector(".home-opening__drawing").dispatchEvent(childEvent));
  assert.ok(container.querySelector(".home-opening"));
  const event = new window.Event("animationend", { bubbles: true });
  Object.defineProperty(event, "animationName", { value: "home-opening-exit" });
  await act(async () => scene.dispatchEvent(event));
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

test("preview query replays the drawing without clearing the session", async () => {
  sessionStorage.setItem("violet-home-drawing-v2-viewed", "1");
  document.documentElement.classList.add("home-opening-seen");
  window.matchMedia = () => ({ matches: false });
  window.history.replaceState(null, "", "/?opening=1&pens=1");
  root = createRoot(container);
  await act(async () => root.render(createElement(HomeOpening)));
  assert.ok(container.querySelector(".home-opening"));
  assert.equal(document.documentElement.classList.contains("home-opening-seen"), false);
  await tick(0);
  await tick(4200);
  assert.equal(contexts.get(container.querySelector(".home-opening__ink")).strokes[0].filter(([command]) => command === "M").length, 1);
  await act(async () => container.querySelector("button").click());
  assert.equal(main.hasAttribute("inert"), false);
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
