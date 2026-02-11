export default function OfflinePage() {
  return (
    <div className="min-h-dvh bg-bg-base text-text-primary flex items-center justify-center px-5">
      <div className="w-full max-w-[430px] text-center">
        <div className="text-[10px] font-bold tracking-[3px] text-accent-primary">
          VAULT
        </div>
        <h1 className="mt-2 font-display text-[28px] font-extrabold leading-[1.1]">
          You&apos;re offline
        </h1>
        <p className="mt-3 text-[13px] text-text-secondary leading-relaxed">
          Some content may still be available from cache. Reconnect to continue
          syncing your photos.
        </p>
      </div>
    </div>
  );
}

