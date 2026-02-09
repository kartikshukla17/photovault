import type { VaultPhoto } from "./types";

const monthFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});

export type PhotoMonthGroup = {
  key: string;
  label: string;
  photos: VaultPhoto[];
};

export function groupPhotosByMonth(photos: VaultPhoto[]): PhotoMonthGroup[] {
  const map = new Map<string, VaultPhoto[]>();
  for (const photo of photos) {
    const key = `${photo.takenAt.getFullYear()}-${String(
      photo.takenAt.getMonth() + 1,
    ).padStart(2, "0")}`;
    const next = map.get(key) ?? [];
    next.push(photo);
    map.set(key, next);
  }

  const groups: PhotoMonthGroup[] = Array.from(map.entries()).map(
    ([key, grouped]) => {
      const dateForLabel = grouped[0]?.takenAt ?? new Date();
      return { key, label: monthFormatter.format(dateForLabel), photos: grouped };
    },
  );

  groups.sort((a, b) => (a.key < b.key ? 1 : -1));
  return groups;
}

