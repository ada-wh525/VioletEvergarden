import assert from "node:assert/strict";
import test from "node:test";
import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import ts from "typescript";
import { Window } from "happy-dom";

const project = new URL("../", import.meta.url).pathname;
await mkdir(join(project, "work"), { recursive: true });
const directory = await mkdtemp(join(project, "work", "opening-test-"));
const source = await readFile(join(project, "components/home-opening.tsx"), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const modulePath = join(directory, "opening.mjs");
await writeFile(modulePath, output);

const window = new Window({ url: "http://localhost/" });
for (const name of ["document", "HTMLElement", "KeyboardEvent", "Event", "sessionStorage", "location"]) globalThis[name] = window[name];
globalThis.window = window;
globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.matchMedia = () => ({ matches: false });

const { createElement, act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { HomeOpening } = await import(modulePath);
const container = document.createElement("div");
const main = document.createElement("main");
main.innerHTML = '<section id="top"><h1 tabindex="-1">薇尔莉特</h1></section>';
document.body.append(container, main);
let root = createRoot(container);

test("first visit opens an accessible letter, then skip restores the page and remembers the visit", async () => {
  await act(async () => root.render(createElement(HomeOpening)));
  assert.equal(container.querySelector('[role="dialog"]')?.getAttribute("aria-label"), "启封信件");
  assert.match(container.querySelector(".home-opening__letter-date time")?.textContent ?? "", /\d{4}[/-]/);
  assert.ok(container.querySelector(".home-opening__tray"));
  assert.equal(container.querySelector(".home-opening__paper-title")?.textContent, "薇尔莉特·伊芙加登");
  assert.equal(container.querySelector(".home-opening__unfold-inner strong")?.textContent, "薇尔莉特·伊芙加登");
  assert.match(container.querySelector(".home-opening__cut-line path")?.getAttribute("d") ?? "", /^M 0 5 L 8 11 L 16 5/);
  assert.equal(container.querySelector(".home-opening__knife img")?.getAttribute("src"), "/images/antique-letter-opener.webp");
  assert.equal(document.activeElement?.textContent?.trim(), "跳过 ↗");
  assert.ok(main.hasAttribute("inert"));
  assert.equal(document.body.style.overflow, "hidden");

  await act(async () => container.querySelector("button").click());
  assert.equal(container.querySelector(".home-opening"), null);
  assert.equal(main.hasAttribute("inert"), false);
  assert.equal(document.body.style.overflow, "");
  assert.equal(sessionStorage.getItem("violet-home-opening-viewed"), "1");
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
  const scene = container.querySelector(".home-opening");
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

test("preview query replays the letter without clearing the session", async () => {
  sessionStorage.setItem("violet-home-opening-viewed", "1");
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
