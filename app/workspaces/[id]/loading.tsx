/**
 * Loading UI for workspace page - matches app builder loader style
 */
export default function Loading() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016] text-white"
      style={{ margin: 0 }}
      aria-label="Loading"
    >
      <div className="flex flex-col items-center gap-6">
        <div
          className="h-10 w-10 rounded-full border-2 border-[#10ff8b] border-t-transparent animate-spin"
          style={{ animationDuration: '0.8s' }}
        />
        <p className="text-sm text-white/70 font-medium">Open Idea</p>
      </div>
    </div>
  );
}
