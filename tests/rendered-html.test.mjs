import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Violet Evergarden tribute", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /薇尔莉特·伊芙加登/);
  assert.match(html, /Violet/);
  assert.match(html, /写给世界的，第十四封信/);
  assert.match(html, /href="\/violet-hero-clean\.webp"/);
  assert.match(html, /人物档案/);
  assert.match(html, /应援手册/);
});

test("keeps interaction and accessibility safeguards in place", async () => {
  const [page, css, contact] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/contact/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(page, /window\.addEventListener\(["']scroll/);
  assert.match(page, /aria-modal="true"/);
  assert.match(page, /role="tabpanel"/);
  assert.match(page, /aria-current=/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /min-height:\s*100dvh/);
  assert.match(css, /violet-hero-clean\.webp/);
  assert.doesNotMatch(`${page}\n${contact}`, /[—–]/);
});

test("server-renders the author contact page", async () => {
  const response = await render("/contact");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /写给作者的/);
  assert.match(html, /550677115@qq\.com/);
  assert.match(html, /寄给作者/);
  assert.match(html, /Web3Forms/);
});
