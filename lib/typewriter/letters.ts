export type PracticeLanguage = "zh" | "ja" | "en";

export const PRACTICE_LANGUAGES: { id: PracticeLanguage; label: string; inputLabel: string }[] = [
  { id: "zh", label: "中文", inputLabel: "中文打字练习输入" },
  { id: "ja", label: "日本語", inputLabel: "日文打字练习输入" },
  { id: "en", label: "English", inputLabel: "英文打字练习输入" },
];

// Chinese/Japanese supplied by the repository owner. Japanese transcription typos
// are normalized; English is translated from the supplied text, not an official translation.
export const PRACTICE_LETTERS = [{
  id: "major",
  title: "致少佐",
  signature: "薇尔莉特",
  versions: {
    zh: {
      addressee: "亲爱的吉尔伯特少佐：",
      body: "您近来一切安好吗？您现在在哪里呢？有没有烦恼呢。无论春夏秋冬，四季轮转，唯独有少佐您的季节却迟迟不来。我起初不懂，不懂少佐您的心意。但是在少佐您赐予我的新的生命中，我稍微能感受到了，通过代笔写信，通过与我邂逅的人。我相信着，少佐您一定在某个地方活着。所以我也要好好地活着，即使不知道前方有什么也要好好活着。如果我们还能相见，我想跟您说：“现在，我已经略略懂得‘爱’为何物了”。",
    },
    ja: {
      addressee: "親愛なるギルベルト少佐",
      body: "お元気ですか。お変わりないですか。今、どこにいらっしゃいますか。困ったことはありませんか。春も、夏も、秋も、冬も、いくつも季節が過ぎましたが、少佐のいらっしゃる季節だけが巡ってきません。私、最初は分かりませんでした。少佐のお気持ちが、何一つ分かりませんでした。でも、少佐に頂いたこの新しい人生の中で、少しだけですが、感じることが出来るようになったのです。代筆を通して、出会った方たちを通して。私は信じています。少佐がどこかで生きていらっしゃることを。だから私も、生きて、生きて、生きて……。その先に何があるか分からなくても、ただ生きて。そして、また会えたら、こう伝えたいのです。私は、今、「愛してる」も、少しは分かるのです。",
    },
    en: {
      addressee: "Dear Major Gilbert,",
      body: "How have you been? Where are you now? Is anything troubling you? Spring, summer, autumn, and winter have come and gone, yet the season with you in it never arrives. At first, I did not understand. I understood nothing of your feelings. But in this new life you gave me, I have begun to understand a little, through writing letters for others and through the people I have met. I believe that you are alive somewhere. So I, too, will keep living, even if I do not know what lies ahead. If we can meet again, I want to tell you: I now understand a little of what love means.",
    },
  },
}] as const;
