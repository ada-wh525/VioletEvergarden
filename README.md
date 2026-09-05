# 薇尔莉特纪念站

基于 vinext 和 Cloudflare Workers 的同人纪念页面，包含作品资料、主题信笺、陌生来信、投稿审核、点赞、举报与投稿者封禁。

## 本地运行

需要 Node.js 22.13 或更高版本。

```bash
npm install
npm run dev
```

访问 `http://localhost:3000`。本地未连接 D1 时，`/letters` 会使用内置的 6 封演示信。

## 页面入口

- `/`：纪念站首页
- `/letters`：随机阅读和匿名投稿
- `/contact`：联系作者
- `/admin/letters`：单人审核后台

审核后台不会出现在公开导航中，并且设置为不允许搜索引擎收录。

## Cloudflare D1

Cloudflare Worker 中的 D1 绑定名必须是 `DB`。

新数据库按顺序执行：

1. `drizzle/0000_absent_synch.sql`
2. `drizzle/0001_flippant_odin.sql`
3. `drizzle/0002_funny_rockslide.sql`
4. 可选执行 `drizzle/seed-demo-letters.sql`，加入 6 封公开样例信

如果数据库已经创建过 `letters` 表，只执行 `drizzle/0002_funny_rockslide.sql`。

## Cloudflare 变量

在 Worker 的 `设置 > 变量和机密` 中添加运行时变量：

```text
LETTER_SUBMISSIONS_ENABLED=true
LETTER_REACTIONS_ENABLED=true
ADMIN_REVIEW_PASSWORD=你的审核口令
```

`ADMIN_REVIEW_PASSWORD` 应选择“机密”类型，另外两个选择普通文本。保存后点“部署”。

在 `设置 > 构建 > 构建变量和机密` 中添加构建变量：

```text
NEXT_PUBLIC_LETTER_API_ENABLED=true
```

然后重新部署一次。构建变量决定前端使用 D1 API 还是本地演示信池，运行时变量决定 Worker 是否接受投稿、点赞和举报。

## 审核与封禁

- 新投稿先进入 `pending`，只有手动通过后才进入随机信池。
- 关键词审核会展示风险分和命中类别，个人联系方式会在投稿时直接拦截。
- 同一匿名浏览器对同一封信只能点赞一次、举报一次。
- 一封信累计 3 次举报后自动撤回待审队列。
- 封禁投稿者会拒绝该匿名身份的全部来信，并阻止它继续投稿、点赞或举报。
- 解除封禁不会自动恢复旧信，仍需逐封重新审核。

匿名封禁依赖浏览器 Cookie。访客主动清除 Cookie 后会获得新的匿名身份，因此它适合日常管理，不等同于账号级或网络级封禁。需要更强防护时，可在 Cloudflare 中为审核路径配置 Access，并为写入接口增加 Turnstile 与速率限制。

## 检查命令

```bash
npm run lint
npm run build
node --test tests/rendered-html.test.mjs
npm run db:generate
```
