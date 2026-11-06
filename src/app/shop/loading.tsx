export default function Loading() {
  return (
    <div className="space-y-3 px-4 pt-4" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-12" />
      <div className="skeleton h-9 w-2/3" />
      {Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-36" />)}
    </div>
  );
}
