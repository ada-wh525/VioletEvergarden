# 薇尔莉特纪念站

基于 vinext 和 Cloudflare Workers 的同人纪念页面，包含作品资料、主题信笺、陌生来信、投稿审核、点赞、举报与投稿者封禁。

## 本地运行

需要 Node.js 22.13 或更高版本。

```bash
npm install
npm run dev
```

访问 `http://localhost:3000`。陌生来信功能需要可用的 D1 绑定和 Turnstile 配置，本地页面不会生成替代投稿或替代信件。

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
TURNSTILE_SITE_KEY=Turnstile 的公开站点密钥
TURNSTILE_SECRET_KEY=Turnstile 的私密密钥
```

`ADMIN_REVIEW_PASSWORD` 和 `TURNSTILE_SECRET_KEY` 应选择“机密”类型，其余三个选择普通文本。保存变量后部署当前版本。

在 Cloudflare 控制台打开 `Turnstile`，新建站点并添加 `violetever.garden`。小组件模式选择托管，创建后把站点密钥填入 `TURNSTILE_SITE_KEY`，把私密密钥填入 `TURNSTILE_SECRET_KEY`。如果还要通过 `workers.dev` 地址测试，需要把对应主机名也加入 Turnstile 的允许列表。

生产站始终通过 D1 API 读取和提交信件。运行时变量决定 Worker 是否接受投稿、点赞和举报。投稿表单只有在 Turnstile 浏览器验证和 Worker 服务端复核均通过后才会写入 D1。

## 审核与封禁

- 新投稿先进入 `pending`，只有手动通过后才进入随机信池。
- 关键词审核会展示风险分和命中类别，个人联系方式会在投稿时直接拦截。
- 同一匿名浏览器对同一封信只能点赞一次、举报一次。
- 一封信累计 3 次举报后自动撤回待审队列。
- 封禁投稿者会拒绝该匿名身份的全部来信，并阻止它继续投稿、点赞或举报。
- 解除封禁不会自动恢复旧信，仍需逐封重新审核。

匿名封禁依赖浏览器 Cookie。访客主动清除 Cookie 后会获得新的匿名身份，因此它适合日常管理，不等同于账号级或网络级封禁。需要更强防护时，可在 Cloudflare 中为审核路径配置 Access，并为写入接口增加速率限制。

## 检查命令

```bash
npm run lint
npm run build
node --test tests/rendered-html.test.mjs
npm run db:generate
```
