/**
 * Placeholder shown inside the app frame while a screen's data loads, so the sidebar stays put
 * and the content area never turns into a blank white page. Mirrors the dashboard's layout.
 */
export default function PageSkeleton() {
  const block = "animate-pulse rounded-[9px] bg-[#174538]/10";
  const card = "animate-pulse rounded-[9px] border border-[#174538]/15 bg-white";
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className={`${block} h-12 w-56`} />
        <div className="flex gap-3"><div className={`${block} h-[42px] w-40`} /><div className={`${block} h-[42px] w-52`} /></div>
      </div>
      <div className={`${card} mt-6 h-[188px]`} />
      <div className={`${card} mt-6 h-[132px]`} />
      <div className={`${block} mt-10 h-8 w-48`} />
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className={`${card} h-[9.5rem]`} />)}
      </div>
    </div>
  );
}
