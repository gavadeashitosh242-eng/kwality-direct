import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import DataTable from "../../components/DataTable";
import StatCard from "../../components/StatCard";
import StatusBadge from "../../components/StatusBadge";
import api from "../../services/api";

export default function RetailerPaymentsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/retailers/payments").then((res) => setData(res.data)).catch(() => setError("Could not load your payments."));
  }, []);

  return (
    <DashboardLayout role="retailer">
      <h1 className="text-xl font-semibold text-[var(--color-ink)]">Payments</h1>
      <p className="mt-1 text-sm text-[var(--color-slate)]">Only your own orders and payment status.</p>

      {error && <p className="mt-4 text-sm text-[var(--color-stop)]">{error}</p>}

      {data && (
        <>
          <div className="mt-5 grid grid-cols-3 gap-4 max-w-xl">
            <StatCard label="Total billed" value={`₹${data.total_billed.toLocaleString("en-IN")}`} accent="amber" />
            <StatCard label="Paid" value={`₹${data.total_paid.toLocaleString("en-IN")}`} accent="go" />
            <StatCard label="Pending" value={`₹${data.total_pending.toLocaleString("en-IN")}`} accent="stop" />
          </div>

          <div className="mt-5">
            <DataTable
              columns={[
                { key: "order_code", label: "Order" },
                { key: "delivery_date", label: "Date" },
                { key: "total_amount", label: "Total", render: (r) => `₹${r.total_amount.toLocaleString("en-IN")}` },
                { key: "paid_amount", label: "Paid", render: (r) => `₹${r.paid_amount.toLocaleString("en-IN")}` },
                { key: "pending_amount", label: "Pending", render: (r) => `₹${r.pending_amount.toLocaleString("en-IN")}` },
                { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
              ]}
              rows={data.orders}
              emptyLabel="No orders yet."
            />
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
