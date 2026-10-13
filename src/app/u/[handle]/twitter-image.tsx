import { DB } from "@/lib/world";
import { handleOf } from "@/lib/profile";
import { CARD_SIZE, renderShareCard } from "@/lib/share-card";

export const size = CARD_SIZE;
export const contentType = "image/png";
export const alt = "Domainers Map profile card";

export function generateStaticParams() {
  return DB.people.map((p) => ({ handle: handleOf(p) }));
}

export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  return renderShareCard((await params).handle);
}
