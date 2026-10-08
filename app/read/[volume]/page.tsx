import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReadFooter, ReadNav } from "../../../components/read/read-frame";
import { VolumeSheet } from "../../../components/read/volume-sheet";
import { getVolume, VOLUMES } from "../../../lib/novel";
import "../read.css";

type Params = { volume: string };

export function generateStaticParams(): Params[] {
  return VOLUMES.map((volume) => ({ volume: volume.id }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { volume: id } = await params;
  const volume = getVolume(id);
  if (!volume) return { title: "未找到这封信" };
  return {
    title: `${volume.title} ${volume.subtitle}｜原著书信`,
    description: `${volume.addressee}。共 ${volume.chapters.length} 章。`,
  };
}

export default async function VolumePage({ params }: { params: Promise<Params> }) {
  const { volume: id } = await params;
  const volume = getVolume(id);
  if (!volume) notFound();

  return (
    <div className={`read-page read-volume tone-${volume.tone}`} data-theme="prussian">
      <ReadNav back={{ href: "/read", label: "信匣" }} />
      <main className="volume-main">
        <VolumeSheet volume={volume} />
      </main>
      <ReadFooter />
    </div>
  );
}
