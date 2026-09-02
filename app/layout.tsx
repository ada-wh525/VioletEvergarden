import type { Metadata } from "next";
import { headers } from "next/headers";
import { Cormorant_Garamond, Noto_Sans_SC } from "next/font/google";
import "./globals.css";

const serif = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const sans = Noto_Sans_SC({
  variable: "--font-sans-cn",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${protocol}://${host}`;
  const imageUrl = new URL("/og.png", baseUrl).toString();
  const title = "薇尔莉特·伊芙加登｜永远的自动手记人偶";
  const description = "一封写给薇尔莉特的情书：人物档案、书信旅程、经典台词与粉丝应援手册。";

  return {
    title,
    description,
    icons: { icon: "/favicon.png", shortcut: "/favicon.png" },
    openGraph: {
      type: "website",
      locale: "zh_CN",
      title,
      description,
      images: [{ url: imageUrl, width: 1672, height: 941, alt: "Violet Evergarden · Letters from the Heart" }],
    },
    twitter: { card: "summary_large_image", title, description, images: [imageUrl] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preload" as="image" href="/violet-hero-clean.webp" fetchPriority="high" />
      </head>
      <body className={`${serif.variable} ${sans.variable}`}>{children}</body>
    </html>
  );
}
