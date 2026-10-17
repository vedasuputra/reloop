import PageSkeleton from "@/components/PageSkeleton";

/**
 * Fully static stand-in for AppShell (it reads no cookies, so it may be prerendered): the green sidebar with grey
 * placeholders for the links, next to the content skeleton. Shown for a moment before the real shell streams in.
 */
export default function AppShellSkeleton() {
  const bar = "h-9 animate-pulse bg-[#FFFEF6]/15";
  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      <aside className="flex flex-col gap-4 bg-gradient-to-b from-[#2F594F] to-[#264840] py-4 text-[#FFFEF6] md:sticky md:top-0 md:h-screen md:w-[300px] md:shrink-0 md:gap-8 md:py-7">
        <div className="px-4 text-lg font-semibold uppercase tracking-[0.12em] md:px-7">ReLoop AI</div>
        <div className="hidden space-y-1 md:block">
          <div className={bar} />
          <div className="h-6" />
          {[1, 2, 3].map((i) => <div key={i} className={bar} />)}
          <div className="h-6" />
          {[4, 5, 6].map((i) => <div key={i} className={bar} />)}
          <div className="h-6" />
          {[7, 8, 9].map((i) => <div key={i} className={bar} />)}
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col bg-[#FFFEF6]">
        <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 md:px-10 md:py-14"><PageSkeleton /></div>
      </main>
    </div>
  );
}
