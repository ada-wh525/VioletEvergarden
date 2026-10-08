import { PRACTICE_LETTERS } from "../../typewriter/letters";
import type { VolumeSource } from "../types";

// 排版样张使用站主提供的练习信（lib/typewriter/letters.ts），仅用于预览阅读页。
// 正式译文放入后请删除 sample 章节。
const sample = PRACTICE_LETTERS[0].versions.zh;

export const VOLUME_I: VolumeSource = {
  id: "i",
  numeral: "I",
  title: "紫罗兰永恒花园",
  subtitle: "上卷",
  published: "2015.12.25",
  addressee: "致 第一次听见「爱」这个词的人",
  provenance: "译文待放入。放入前请确认译者授权，并在此处注明译者。",
  tone: "blue",
  chapters: [
    {
      slug: "sample",
      sample: true,
      title: "排版样张",
      note: "文本来自站主提供的练习信 · 仅用于预览",
      text: `这一页只用于预览阅读页的排版：正文、段落间距、章节页眉与信中信的样式。正式译文放入后，请删除这一章。

下面是一封嵌入正文的信。写作时，把信件包在 :::letter 与 ::: 之间，第一行以“> ”开头作为称呼，最后一行以“-- ”开头作为署名。

:::letter
> ${sample.addressee}
${sample.body}
-- 薇尔莉特
:::

信件之后，正文继续。三个星号单独成行时，会渲染为一枚小小的分节邮戳。

* * *

分节之后的段落。阅读进度会按段落记忆，下次打开时自动回到离开的地方。`,
    },
    { slug: "chapter-01", title: "第一章", note: "待放入译文", text: "" },
    { slug: "chapter-02", title: "第二章", note: "待放入译文", text: "" },
    { slug: "chapter-03", title: "第三章", note: "待放入译文", text: "" },
  ],
};
