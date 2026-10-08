import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "原著书信｜薇尔莉特·伊芙加登",
  description: "把每一卷原著当作一封信来拆开：信匣、目录与阅读页。",
};

export default function ReadLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
