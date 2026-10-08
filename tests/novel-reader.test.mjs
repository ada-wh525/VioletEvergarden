import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the letter case with one envelope per volume", async () => {
  const response = await render("/read");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /每一卷/);
  assert.equal((html.match(/class="envelope-link"/g) ?? []).length, 4);
  assert.match(html, /2015\.12\.25/);
  assert.match(html, /Ever After/);
  assert.match(html, /href="\/read\/i"/);
});

test("server-renders a volume sheet with its chapter list", async () => {
  const response = await render("/read/i");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /目录/);
  assert.match(html, /class="chapter-row" data-state="pending"/);
  assert.match(html, /href="\/read\/i\/sample"/);
  assert.match(html, /译文待放入/);
});

test("server-renders the sample sheet with an in-story letter and the pending state", async () => {
  const sample = await render("/read/i/sample");
  assert.equal(sample.status, 200);
  const html = await sample.text();
  assert.match(html, /class="ink-letter/);
  assert.match(html, /亲爱的吉尔伯特少佐/);
  assert.match(html, /class="ink-break"/);
  assert.match(html, /class="post-route"/);
  assert.match(html, /aria-controls="read-settings"/);

  const pending = await render("/read/ii/chapter-01");
  assert.equal(pending.status, 200);
  assert.match(await pending.text(), /这封信还封着/);

  const missing = await render("/read/ix/nothing");
  assert.equal(missing.status, 404);
});
