# 首页入场素材

日期统一为日本原始发行日期。TV 首播采用官方 2017-12-09 公告的节目日期 2018-01-10（深夜放送时段）。

| 内容 | 日期 | 资料来源 | 官方素材原址 |
| --- | --- | --- | --- |
| 小说上卷 | 2015-12-25 | https://www.kyotoanimation.co.jp/books/lineup/?cd=978-4-907064-43-3 | https://www.kyotoanimation.co.jp/img/books/lineup/018_violet1.jpg |
| TV 动画 | 2018-01-10 | https://tv.violet-evergarden.jp/ | https://tv.violet-evergarden.jp/img/top/keyvisual_slide01.jpg |
| 外传 | 2019-09-06 | https://violet-evergarden.jp/news/?id=64 | https://violet-evergarden.jp/img/sidestory/mainvisualSS01.jpg |
| 剧场版 | 2020-09-18 | https://violet-evergarden.jp/news/?id=113 | https://violet-evergarden.jp/img/top/keyvisual02.webp |

封面缩略图仅用于对应作品介绍，版权归各权利人。文件位于 `public/works/`，未重新绘制或冒充官方封面。

## 首页人物图

文件：`public/violet-portrait.webp`。使用内置 imagegen，编辑参考为原仓库的 1086 × 1448 线稿，旧首页图只作配色参考。生成后仅转换为 WebP，原生成稿留在工作目录。它是本站使用的生成插画，不是官方图片。

生成要求：严格保持原线稿 3:4 画幅、人物朝左低头、刘海遮眼、发辫与缎带、胸针、单只机械手和信件的原有位置；在轮廓内加入金发、藏蓝外套、象牙白领巾、银色义手和祖母绿胸针，背景为 #f4f0e8 纸色，不加窗景、花、文字或装饰。

原始动画由站主提供的 crchc/violet 源码移植，核心绘图文件保持原样。时间驱动部分适配到现有 React 页面，未引入 Svelte 或全页滚动占位；原镜头、28 秒绘画节奏、湿墨与亮色展开保留。

眼部修订：按站主反馈，用内置 imagegen 仅调整刘海遮挡与眼部，露出一只自然的蓝色眼睛，保留低头左向的姿态、外轮廓、胸针和持信手的位置。提示要求：一只蓝色眼睛从刘海下自然显露，目光柔和向左下，略微柔化附近面部阴影，其余构图、比例、配色与背景保持原样。
