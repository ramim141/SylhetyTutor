export function TutorCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-bg-card p-5 flex flex-col gap-4" aria-hidden>
      <div className="flex gap-3.5">
        <div className="w-13 h-13 rounded-full skeleton" />
        <div className="flex-1 flex flex-col gap-2 pt-1">
          <div className="h-4 w-2/3 rounded-sm skeleton" />
          <div className="h-3.5 w-1/2 rounded-sm skeleton" />
          <div className="h-3 w-3/4 rounded-sm skeleton" />
        </div>
      </div>
      <div className="h-px bg-border-light" />
      <div className="h-11 rounded-md skeleton" />
    </div>
  );
}

export default TutorCardSkeleton;
