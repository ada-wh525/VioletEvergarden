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

Cloudflare Worker 中的 D1 绑定名固定为 `DB`，数据库名称为 `violet-letters-prod`。逻辑绑定和数据库 ID 已随部署配置保存，Git 自动部署会继续携带该绑定。

新数据库按顺序执行：

1. `drizzle/0000_absent_synch.sql`
2. `drizzle/0001_flippant_odin.sql`
3. `drizzle/0002_funny_rockslide.sql`
4. 可选执行 `drizzle/seed-demo-letters.sql`，加入 6 封公开样例信

如果数据库已经创建过 `letters` 表，只执行 `drizzle/0002_funny_rockslide.sql`。

## Cloudflare 变量

在 Worker 的 `设置 > 变量和机密` 中添加以下机密：

```text
ADMIN_REVIEW_PASSWORD=你的审核口令
TURNSTILE_SECRET_KEY=Turnstile 的私密密钥
```

这两项都应选择“机密”类型。保存后部署当前版本。Turnstile 的公开 Site Key 已作为非机密配置随代码部署，也可以通过普通文本变量 `TURNSTILE_SITE_KEY` 临时覆盖。

在 Cloudflare 控制台打开 `Turnstile`，新建站点并添加 `violetever.garden`。小组件模式选择托管，创建后把私密密钥填入 `TURNSTILE_SECRET_KEY`。如果还要通过 `workers.dev` 地址测试，需要把对应主机名也加入 Turnstile 的允许列表。

生产站始终通过 D1 API 读取和提交信件。投稿、点赞和举报默认开启，普通变量与公开 Site Key 已随部署配置保存；如需紧急关闭，可以在 Cloudflare 中把 `LETTER_SUBMISSIONS_ENABLED` 或 `LETTER_REACTIONS_ENABLED` 改为 `false`。投稿表单只有在 Turnstile 浏览器验证和 Worker 服务端复核均通过后才会写入 D1。

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

## 人偶打字室（测试功能）

入口：`/typewriter`，首页导航和页脚均有链接。

- **经典信件练习**：仅保留站主提供的致吉尔伯特少佐信，支持中文、日文、英文切换。底稿为浅灰色，提交后的正确文字为黑色，错误文字为红色并加下划线；全部正确才能寄出。中文输入法组合期间不判色。
- **空白打字室**：自由书写，支持中文、英文及其他语言、换行、收件称呼和署名，每封信最多 2000 字。
- 两种模式共用键盘按压、阴影、色带盘、打字杆、回车杆、机械音效和寄信仪式。音效可关闭，减少动态效果的系统偏好会被尊重。
- 寄信后可下载 PNG。首页与打字室共用 `lib/letter-keepsake.ts`，导出高度随正文增长，不再只保留前 13 行。
- 信件仅在当前页面处理，不发邮件、不进入公开信池。刷新或离开前需自行下载保存。
- `lib/typewriter/letters.ts` 保存站主提供的中日文本和据此翻译的英文；日文修正明显转写错误，英文不标为官方译文。练习信署名为“薇尔莉特”。

### 本地查看

```bash
git switch test/doll-typewriter-practice
npm ci
npm run dev
```

打开 `http://localhost:3000/typewriter`。打字室不需要 D1 数据或 Turnstile，即可练习和导出；其他页面仍沿用原本的运行配置。

```bash
npm run test:typewriter
npm test
```

`test:typewriter` 使用 DOM 环境验证真实 React 事件处理、中日组合输入、三语切换、错误修正、寄信条件、模式切换和图片导出内容。它不替代真实操作系统输入法、浏览器布局和音频听感测试。

开发修改必须在测试／功能分支进行，禁止未经明确批准向 `main` 推送或合并。详见 `AGENTS.md`。

外观参考：[Underwood 四排键便携机与动画截图的实机对照](https://summivox.wordpress.com/2018/02/07/violet-evergardens-typewriter/)。本实现参考其机身、圆键、双线轴、打字杆和回车杆形态，并为现代键盘及中文输入法做适配；型号对应属于外观考据，不表示官方确认。
