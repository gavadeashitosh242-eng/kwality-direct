import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import DataTable from "../../components/DataTable";
import StatCard from "../../components/StatCard";
import api from "../../services/api";

const METHODS = ["cash", "upi", "bank_transfer", "cheque", "other"];

export default function AdminPaymentsPage() {
  const [searchParams] = useSearchParams();
  const preselectedOrderId = searchParams.get("order_id");

  const [payments, setPayments] = useState([]);
  const [error, setError] = useState(null);

  const [orderId, setOrderId] = useState(preselectedOrderId || "");
  const [orderSummary, setOrderSummary] = useState(null);
  const [orderError, setOrderError] = useState(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  function load() {
    api.get("/admin/payments").then((res) => setPayments(res.data)).catch(() => setError("Could not load payments."));
  }
  useEffect(load, []);

  function loadOrderSummary(id) {
    if (!id) {
      setOrderSummary(null);
      return;
    }
    api
      .get(`/admin/orders/${id}/payments`)
      .then((res) => {
        setOrderSummary(res.data.summary);
        setOrderError(null);
      })
      .catch(() => {
        setOrderSummary(null);
        setOrderError("Order not found.");
      });
  }

  useEffect(() => {
    if (preselectedOrderId) loadOrderSummary(preselectedOrderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedOrderId]);

  async function handleLookup(e) {
    e.preventDefault();
    loadOrderSummary(orderId);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await api.post(`/admin/orders/${orderId}/payments`, { amount: Number(amount), method, notes });
      setOrderSummary(res.data.summary);
      setAmount("");
      setNotes("");
      load();
    } catch (err) {
      setFormError(err.response?.data?.error || "Could not record payment.");
    } finally {
      setSaving(false);
    }
  }

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <DashboardLayout role="admin">
      <h1 className="text-xl font-semibold text-[var(--color-ink)]">Payments</h1>
      <p className="mt-1 text-sm text-[var(--color-slate)]">
        Record a payment against any order — total/paid/pending is always derived from these records.
      </p>

      <div className="mt-4 max-w-xs">
        <StatCard label="Total collected" value={`₹${totalCollected.toLocaleString("en-IN")}`} accent="go" />
      </div>

      <div className="mt-6 bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5 max-w-lg">
        <p className="text-sm font-medium text-[var(--color-ink)]">Record a payment</p>
        <form onSubmit={handleLookup} className="mt-3 flex gap-2">
          <input
            placeholder="Order ID (e.g. 3)"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="flex-1 rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
          />
          <button className="rounded-lg border border-[var(--color-line)] text-sm font-medium px-4">Look up</button>
        </form>
        {orderError && <p className="mt-2 text-sm text-[var(--color-stop)]">{orderError}</p>}

        {orderSummary && (
          <div className="mt-4">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-[var(--color-slate)]">Total</p>
                <p className="font-medium text-[var(--color-ink)]">₹{orderSummary.total_amount.toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-[var(--color-slate)]">Paid</p>
                <p className="font-medium text-[var(--color-go)]">₹{orderSummary.paid_amount.toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-[var(--color-slate)]">Pending</p>
                <p className="font-medium text-[var(--color-stop)]">₹{orderSummary.pending_amount.toLocaleString("en-IN")}</p>
              </div>
            </div>

            {orderSummary.pending_amount > 0 && (
              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
                />
                <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm">
                  {METHODS.map((m) => (
                    <option key={m} value={m}>{m.replace(/_/g, " ")}</option>
                  ))}
                </select>
                <input
                  placeholder="Notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
                />
                {formError && <p className="text-sm text-[var(--color-stop)]">{formError}</p>}
                <button disabled={saving} className="w-full rounded-lg bg-[var(--color-amber)] hover:bg-[var(--color-amber-deep)] text-white text-sm font-medium py-2 disabled:opacity-60">
                  {saving ? "Recording…" : "Record payment"}
                </button>
              </form>
            )}
            {orderSummary.pending_amount <= 0 && (
              <p className="mt-3 text-sm text-[var(--color-go)]">This order is fully paid.</p>
            )}
          </div>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-[var(--color-stop)]">{error}</p>}

      <div className="mt-6">
        <p className="text-sm font-medium text-[var(--color-ink)] mb-2">All payments</p>
        <DataTable
          columns={[
            { key: "order_code", label: "Order" },
            { key: "retailer_shop_name", label: "Retailer" },
            { key: "amount", label: "Amount", render: (p) => `₹${p.amount.toLocaleString("en-IN")}` },
            { key: "method", label: "Method", render: (p) => p.method.replace(/_/g, " ") },
            { key: "notes", label: "Notes", render: (p) => p.notes || "—" },
            { key: "created_at", label: "Recorded", render: (p) => new Date(p.created_at).toLocaleString() },
          ]}
          rows={payments}
          emptyLabel="No payments recorded yet."
        />
      </div>
    </DashboardLayout>
  );
}
