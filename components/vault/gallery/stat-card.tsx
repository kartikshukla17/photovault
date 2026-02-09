import { Card } from "@/components/ui/card";

export function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <Card className="p-4">
      <div className="font-display text-[19px] font-extrabold leading-none">
        {value}
      </div>
      <div className="mt-2 text-[11px] font-semibold text-text-muted">
        {label}
      </div>
    </Card>
  );
}

