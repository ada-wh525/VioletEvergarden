import assert from "node:assert/strict";
import test from "node:test";
import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import ts from "typescript";
import { Window } from "happy-dom";

const project = new URL("../", import.meta.url).pathname;
await mkdir(join(project, "work"), { recursive: true });
const directory = await mkdtemp(join(project, "work", "opening-test-"));
for (const [sourcePath, name] of [["lib/violet-outline.ts", "violet-outline"], ["lib/violet-drawing.ts", "violet-drawing"], ["components/home-opening.tsx", "opening"]]) {
  const source = await readFile(join(project, sourcePath), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText
    .replaceAll('"../lib/violet-drawing"', '"./violet-drawing.mjs"')
    .replaceAll('"../lib/violet-outline"', '"./violet-outline.mjs"')
    .replaceAll('"./violet-outline"', '"./violet-outline.mjs"');
  await writeFile(join(directory, `${name}.mjs`), output);
}
const modulePath = join(directory, "opening.mjs");

const window = new Window({ url: "http://localhost/" });
for (const name of ["document", "HTMLElement", "KeyboardEvent", "Event", "sessionStorage", "location"]) globalThis[name] = window[name];
globalThis.window = window;
globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.matchMedia = () => ({ matches: false });
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
  assert.ok(container.querySelector(".home-opening__line"));
  assert.equal(container.querySelector(".home-opening__line").getAttribute("stroke-dashoffset"), "1");
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
  assert.equal(sessionStorage.getItem("violet-home-drawing-viewed"), "1");
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
  const scene = container.querySelector(".home-opening");
  assert.ok(scene.classList.contains("is-arriving"));
  assert.equal(container.querySelector(".home-opening__line").getAttribute("stroke-dashoffset"), "0");
  assert.equal(container.querySelector(".home-opening__gem").getAttribute("opacity"), "1");
  assert.equal(container.querySelector(".home-opening__pen").getAttribute("opacity"), "0");
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
  sessionStorage.setItem("violet-home-drawing-viewed", "1");
  document.documentElement.classList.add("home-opening-seen");
  window.matchMedia = () => ({ matches: false });
  window.history.replaceState(null, "", "/?opening=1");
  root = createRoot(container);
  await act(async () => root.render(createElement(HomeOpening)));
  assert.ok(container.querySelector(".home-opening"));
  assert.equal(document.documentElement.classList.contains("home-opening-seen"), false);
  await act(async () => container.querySelector("button").click());
  assert.equal(main.hasAttribute("inert"), false);
  await act(async () => root.unmount());
  await rm(directory, { recursive: true, force: true });
});
