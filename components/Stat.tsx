export default function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded border p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
      {note && <p className="text-xs text-gray-500">{note}</p>}
    </div>
  );
}
