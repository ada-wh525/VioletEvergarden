import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "信件审核室｜薇尔莉特·伊芙加登",
  description: "陌生来信的私人审核工作台。",
  robots: { index: false, follow: false },
};

export default function ReviewLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
