/** Small GET form to pick an order by id, keeping method/preset/org. */
export default function OrderPicker({ action, orderId, method, presetKey, orgId }:
  { action: string; orderId: string; method: string; presetKey: string; orgId: string }) {
  return (
    <form action={action} className="flex items-end gap-2 my-4 text-sm">
      <input type="hidden" name="method" value={method} />
      <input type="hidden" name="preset" value={presetKey} />
      <input type="hidden" name="org" value={orgId} />
      <label className="flex flex-col">Order ID
        <input name="order" defaultValue={orderId} className="rounded border bg-transparent p-1" />
      </label>
      <button className="rounded border px-3 py-1">Tampilkan</button>
    </form>
  );
}
