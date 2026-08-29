import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import DataTable from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import api from "../../services/api";

export default function AdminInvoicesPage() {
  const [searchParams] = useSearchParams();
  const preselectedOrderId = searchParams.get("order_id");

  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState(null);
  const [orderId, setOrderId] = useState(preselectedOrderId || "");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);
  const [genResult, setGenResult] = useState(null);

  function load() {
    api.get("/admin/invoices").then((res) => setInvoices(res.data)).catch(() => setError("Could not load invoices."));
  }
  useEffect(load, []);

  async function handleGenerate(e) {
    e.preventDefault();
    setGenerating(true);
    setGenError(null);
    setGenResult(null);
    try {
      const res = await api.post(`/admin/orders/${orderId}/invoice`);
      setGenResult(res.data);
      load();
    } catch (err) {
      setGenError(err.response?.data?.error || "Could not generate invoice.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <DashboardLayout role="admin">
      <h1 className="text-xl font-semibold text-[var(--color-ink)]">Invoices</h1>
      <p className="mt-1 text-sm text-[var(--color-slate)]">
        An invoice can only be generated for a delivered order — company, retailer, quantity, rate,
        and total are all read live from that order's own permanent record.
      </p>

      <div className="mt-6 bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5 max-w-lg">
        <p className="text-sm font-medium text-[var(--color-ink)]">Generate an invoice</p>
        <form onSubmit={handleGenerate} className="mt-3 flex gap-2">
          <input
            placeholder="Order ID (e.g. 3)"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="flex-1 rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
          />
          <button disabled={generating} className="rounded-lg bg-[var(--color-amber)] hover:bg-[var(--color-amber-deep)] text-white text-sm font-medium px-4 disabled:opacity-60">
            {generating ? "Generating…" : "Generate"}
          </button>
        </form>
        {genError && <p className="mt-2 text-sm text-[var(--color-stop)]">{genError}</p>}
        {genResult && <InvoiceCard invoice={genResult} />}
      </div>

      {error && <p className="mt-4 text-sm text-[var(--color-stop)]">{error}</p>}

      <div className="mt-6">
        <DataTable
          columns={[
            { key: "invoice_number", label: "Invoice" },
            { key: "order_code", label: "Order" },
            { key: "retailer_shop_name", label: "Retailer" },
            { key: "quantity_kg", label: "Qty (KG)" },
            { key: "total_amount", label: "Total", render: (i) => `₹${i.total_amount.toLocaleString("en-IN")}` },
            { key: "payment_status", label: "Payment", render: (i) => <StatusBadge status={i.payment_status} /> },
            { key: "generated_at", label: "Generated", render: (i) => new Date(i.generated_at).toLocaleDateString() },
          ]}
          rows={invoices}
          emptyLabel="No invoices generated yet."
        />
      </div>
    </DashboardLayout>
  );
}

function InvoiceCard({ invoice }) {
  return (
    <div className="mt-4 border border-[var(--color-line)] rounded-lg p-4 text-sm">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-[var(--color-ink)]">{invoice.company_name}</p>
        <p className="text-[var(--color-slate)]">{invoice.invoice_number}</p>
      </div>
      <div className="mt-3 space-y-1">
        <Row label="Order" value={invoice.order_code} />
        <Row label="Retailer" value={invoice.retailer_shop_name} />
        <Row label="Area" value={invoice.area_name} />
        <Row label="Quantity" value={`${invoice.quantity_kg} KG`} />
        <Row label="Rate" value={`₹${invoice.rate_per_kg}/KG`} />
        <Row label="Total" value={`₹${invoice.total_amount.toLocaleString("en-IN")}`} bold />
        <Row label="Delivery date" value={invoice.delivery_date} />
        <Row label="Payment status" value={invoice.payment_status} />
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--color-slate)]">{label}</span>
      <span className={bold ? "font-semibold text-[var(--color-ink)]" : "text-[var(--color-ink)]"}>{value}</span>
    </div>
  );
}
