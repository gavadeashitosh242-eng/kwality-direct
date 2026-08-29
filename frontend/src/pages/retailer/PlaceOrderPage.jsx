import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../services/api";

export default function PlaceOrderPage() {
  const [areas, setAreas] = useState([]);
  const [rate, setRate] = useState(null);
  const [areaId, setAreaId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/retailers/areas").then((res) => setAreas(res.data)).catch(() => {});
    api.get("/retailers/current-rate").then((res) => setRate(res.data)).catch(() => {});
  }, []);

  const estimatedTotal = rate && quantity ? (Number(quantity) * rate.rate_per_kg).toLocaleString("en-IN") : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.post("/retailers/orders", { area_id: areaId, quantity_kg: Number(quantity) });
      setSuccess(res.data);
      setQuantity("");
      setAreaId("");
    } catch (err) {
      setError(err.response?.data?.error || "Could not place order.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout role="retailer">
      <h1 className="text-xl font-semibold text-[var(--color-ink)]">Place an order</h1>
      <p className="mt-1 text-sm text-[var(--color-slate)]">
        Your order locks in today's rate permanently, even if the rate changes tomorrow.
      </p>

      <div className="mt-6 max-w-md">
        <div className="bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--color-slate)]">Today's rate</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--color-amber-deep)]">
            {rate ? `₹${rate.rate_per_kg}` : "—"}
            <span className="text-sm font-normal text-[var(--color-slate)]"> /KG</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5">
          <label className="text-sm font-medium text-[var(--color-ink)]">
            Delivery area
            <select
              required
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-amber)] focus:ring-2 focus:ring-[var(--color-amber)]/30"
            >
              <option value="">Select area…</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>

          <label className="block mt-4 text-sm font-medium text-[var(--color-ink)]">
            Quantity (KG)
            <input
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-amber)] focus:ring-2 focus:ring-[var(--color-amber)]/30"
            />
          </label>

          {estimatedTotal && (
            <p className="mt-3 text-sm text-[var(--color-slate)]">
              Estimated total: <span className="font-semibold text-[var(--color-ink)]">₹{estimatedTotal}</span>
            </p>
          )}

          {error && <p className="mt-3 text-sm text-[var(--color-stop)]">{error}</p>}
          {success && (
            <p className="mt-3 text-sm text-[var(--color-go)]">
              Order {success.order_code} placed — {success.quantity_kg} KG at ₹{success.rate_per_kg}/KG (₹{success.total_amount.toLocaleString("en-IN")} total).{" "}
              <button type="button" onClick={() => navigate("/retailer/orders")} className="underline">
                View my orders
              </button>
            </p>
          )}

          <button
            disabled={saving}
            className="mt-5 w-full rounded-lg bg-[var(--color-amber)] hover:bg-[var(--color-amber-deep)] text-white text-sm font-medium py-2.5 disabled:opacity-60"
          >
            {saving ? "Placing order…" : "Place order"}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
