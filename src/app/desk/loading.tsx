export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-24" />)}</div>
      {Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton h-20" />)}
    </div>
  );
}
