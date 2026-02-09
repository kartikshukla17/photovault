import { IconDownload, IconPlus, IconTrash } from "@/components/vault/icons";
import { cn } from "@/lib/cn";

export function SelectionToolbar({
  count,
  onClear,
  onDelete,
  onAddToAlbum,
  onDownload,
}: {
  count: number;
  onClear: () => void;
  onDelete?: () => void;
  onAddToAlbum?: () => void;
  onDownload?: () => void;
}) {
  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      // Default: just clear selection
      onClear();
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    } else {
      onClear();
    }
  };

  const handleAddToAlbum = () => {
    if (onAddToAlbum) {
      onAddToAlbum();
    }
  };

  return (
    <div
      className={cn(
        "rounded-[16px] bg-[linear-gradient(135deg,#c8a97e,#9a6835)] px-4 py-3",
        "flex items-center justify-between gap-3",
        "animate-[pvSelIn_280ms_cubic-bezier(.16,1,.3,1)_both]",
        "shadow-[0_4px_16px_rgba(200,169,126,0.25)]"
      )}
    >
      <div className="text-[13px] font-semibold text-white">
        {count} selected
      </div>
      <div className="flex items-center gap-2">
        <button
          className="h-9 w-9 rounded-[12px] bg-white/15 text-white active:scale-[0.98]"
          aria-label="Add to album"
          onClick={handleAddToAlbum}
        >
          <IconPlus className="mx-auto h-5 w-5" />
        </button>
        <button
          className="h-9 w-9 rounded-[12px] bg-white/15 text-white active:scale-[0.98]"
          aria-label="Download selected"
          onClick={handleDownload}
        >
          <IconDownload className="mx-auto h-5 w-5" />
        </button>
        <button
          className="h-9 w-9 rounded-[12px] bg-white/15 text-white active:scale-[0.98]"
          aria-label="Delete selected"
          onClick={handleDelete}
        >
          <IconTrash className="mx-auto h-5 w-5" />
        </button>
      </div>
      <style>{`
        @keyframes pvSelIn {
          from { transform: translateY(18px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
