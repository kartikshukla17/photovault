import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/format";

export function StorageCard({
  usedBytes,
  totalBytes,
  label,
}: {
  usedBytes: number;
  totalBytes: number;
  label: string;
}) {
  const pct = Math.round((usedBytes / totalBytes) * 100);
  return (
    <Card className="mx-5 mt-4 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="text-[12px] font-semibold text-text-secondary">
          {label}
        </div>
        <div className="text-[12px] font-semibold text-accent-primary">
          {formatBytes(usedBytes)} / {formatBytes(totalBytes)}
        </div>
      </div>
      <Progress value={pct} className="mt-3 h-[7px]" />
    </Card>
  );
}

