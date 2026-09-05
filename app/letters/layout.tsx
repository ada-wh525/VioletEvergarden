import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "陌生来信｜薇尔莉特·伊芙加登",
  description: "随机拆开一封陌生人的信，或把未能说出口的话寄往莱顿。",
};

export default function LettersLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
