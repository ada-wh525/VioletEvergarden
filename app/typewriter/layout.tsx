import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "练习成为人偶 · C.H. 邮政打字室",
  description: "在复古打字机上练习中文誊写，让一封信从指尖出发。",
};

export default function TypewriterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
