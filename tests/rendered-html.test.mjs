import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { MODERATION_KEYWORDS, moderateLetter } from "../lib/letter-moderation.mjs";

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
  assert.match(html, /<span class="script-word">薇尔莉特<\/span>/);
  assert.match(html, /<span class="serif-word">伊芙加登<\/span>/);
  assert.match(html, /写给世界的，第十四封信/);
  assert.match(html, /href="\/violet-hero-clean\.webp"/);
  assert.match(html, /人物档案/);
  assert.match(html, /应援手册/);
});

test("keeps interaction and accessibility safeguards in place", async () => {
  const [page, css, contact, letters, admin, database, deliveryFlight, defaultLetters, randomRoute, turnstileWidget, turnstileServer, submitRoute, likeRoute, reportRoute, hosting, viteConfig] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/contact/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/letters/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/letters/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../db/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/letter-delivery-flight.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/default-letters.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/random-letter/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/turnstile-widget.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/turnstile.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/submit-letter/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/like-letter/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/report-letter/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../vite.config.ts", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(page, /window\.addEventListener\(["']scroll/);
  assert.match(page, /aria-modal="true"/);
  assert.match(page, /role="tabpanel"/);
  assert.match(page, /aria-current=/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /min-height:\s*100dvh/);
  assert.match(css, /violet-hero-clean\.webp/);
  assert.match(css, /\.brand-mark\s*\{[^}]*transform:\s*none/s);
  assert.match(css, /\.wax-seal span\s*\{[^}]*font:\s*normal/s);
  assert.match(css, /\.letter-submitted::before\s*\{[^}]*pointer-events:\s*none/s);
  assert.match(page, /<LetterDeliveryFlight state=\{deliveryState\}/);
  assert.match(letters, /role="tablist"/);
  assert.match(letters, /\/api\/random-letter/);
  assert.match(letters, /\/api\/submit-letter/);
  assert.match(letters, /\/api\/report-letter/);
  assert.match(letters, /\/api\/like-letter/);
  assert.match(letters, /<a href="\/" aria-label="返回薇尔莉特纪念站首页">/);
  assert.match(letters, /<a className="letters-home-link" href="\/">返回纪念站/);
  assert.match(letters, /turnstileToken/);
  assert.match(letters, /setDeliveryState\("sending"\)/);
  assert.match(letters, /onClick=\{returnToWriting\}/);
  assert.match(letters, /deliveredTitle="信件已进入审核队列"/);
  assert.match(deliveryFlight, /delivery-flight/);
  assert.match(deliveryFlight, /DELIVERING YOUR LETTER/);
  assert.match(letters, /也许路途遥远，但是信总有一天会收到的。/);
  assert.doesNotMatch(letters, /不设公开评论和热度排行/);
  assert.doesNotMatch(letters, /SAMPLE_LETTERS|LETTER_API_ENABLED|localStorage|演示/);
  assert.match(database, /PRAGMA table_info\(letters\)/);
  assert.match(database, /ALTER TABLE letters ADD visitor_id text/);
  assert.match(database, /CREATE TABLE IF NOT EXISTS banned_visitors/);
  assert.match(database, /CREATE TABLE IF NOT EXISTS letter_actions/);
  assert.match(defaultLetters, /archive-01/);
  assert.match(defaultLetters, /archive-06/);
  assert.match(randomRoute, /DEFAULT_LETTERS/);
  assert.match(randomRoute, /INSERT OR IGNORE INTO letters/);
  assert.match(randomRoute, /typeof letter\.likeCount === "number" \? letter\.likeCount : 0/);
  assert.match(randomRoute, /letter service is unavailable/);
  assert.doesNotMatch(randomRoute, /error instanceof Error \? error\.message/);
  assert.match(turnstileWidget, /challenges\.cloudflare\.com\/turnstile\/v0\/api\.js\?render=explicit/);
  assert.match(turnstileWidget, /action:\s*"submit_letter"/);
  assert.match(turnstileServer, /challenges\.cloudflare\.com\/turnstile\/v0\/siteverify/);
  assert.match(turnstileServer, /result\.hostname === requestHostname/);
  assert.match(submitRoute, /verifyTurnstile\(payload\.turnstileToken, request\)/);
  assert.match(submitRoute, /LETTER_SUBMISSIONS_ENABLED\?\.trim\(\)\.toLowerCase\(\) === "false"/);
  assert.match(likeRoute, /LETTER_REACTIONS_ENABLED\?\.trim\(\)\.toLowerCase\(\) === "false"/);
  assert.match(reportRoute, /LETTER_REACTIONS_ENABLED\?\.trim\(\)\.toLowerCase\(\) === "false"/);
  assert.equal(JSON.parse(hosting).d1, "DB");
  assert.match(viteConfig, /database_name:\s*"violet-letters-prod"/);
  assert.match(viteConfig, /LETTER_SUBMISSIONS_ENABLED:\s*"true"/);
  assert.doesNotMatch(`${page}\n${contact}\n${letters}\n${admin}`, /[—–]/);
});

test("server-renders the anonymous letter exchange", async () => {
  const response = await render("/letters");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /今天，有一封信/);
  assert.match(html, /收一封信/);
  assert.match(html, /寄一封信/);
  assert.doesNotMatch(html, /演示信池/);
  assert.match(html, /一封没有指定收件人的信/);
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

test("server-renders the protected letter review page", async () => {
  const response = await render("/admin/letters");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /进入信件审核室|正在确认身份/);
  assert.match(html, /PRIVATE REVIEW OFFICE/);
});

test("scores risky letters and blocks private contact information", () => {
  const ordinary = moderateLetter("今天路过花店时想起了你，愿你一切都好。");
  assert.equal(ordinary.riskScore, 0);
  assert.equal(ordinary.hardBlock, false);

  const selfHarm = moderateLetter("最近我总在想轻 生，也有过伤害自己的念头。");
  assert.ok(selfHarm.riskScore >= 80);
  assert.ok(selfHarm.flags.includes("self_harm"));

  const spam = moderateLetter("加入我们就能刷 单返 利，保证稳赚不赔。");
  assert.ok(spam.flags.includes("scam_spam"));

  const contact = moderateLetter("请联系我的邮箱 reader@example.com");
  assert.equal(contact.hardBlock, true);
  assert.ok(contact.flags.includes("personal_information"));

  assert.ok(Object.keys(MODERATION_KEYWORDS).length >= 8);
});
