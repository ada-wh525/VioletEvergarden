import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChapterReader } from "../../../../components/read/chapter-reader";
import { chapterLabel, getChapter, VOLUMES } from "../../../../lib/novel";
import "../../read.css";

type Params = { volume: string; chapter: string };

export function generateStaticParams(): Params[] {
  return VOLUMES.flatMap((volume) => volume.chapters.map((chapter) => ({ volume: volume.id, chapter: chapter.slug })));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { volume: volumeId, chapter: slug } = await params;
  const found = getChapter(volumeId, slug);
  if (!found) return { title: "未找到这封信" };
  const { volume, chapter } = found;
  return {
    title: `${chapterLabel(chapter)} ${chapter.title}｜${volume.title} ${volume.subtitle}`,
    description: chapter.note ?? `${volume.title} ${volume.subtitle} · 原著书信`,
  };
}

export default async function ChapterPage({ params }: { params: Promise<Params> }) {
  const { volume: volumeId, chapter: slug } = await params;
  const found = getChapter(volumeId, slug);
  if (!found) notFound();

  return (
    <div className={`read-page read-chapter tone-${found.volume.tone}`}>
      <ChapterReader volume={found.volume} chapter={found.chapter} previous={found.previous} next={found.next} nextVolume={found.nextVolume} />
    </div>
  );
}
