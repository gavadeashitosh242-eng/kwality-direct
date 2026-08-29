import { useEffect, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import DashboardLayout from "../../layouts/DashboardLayout";
import StatCard from "../../components/StatCard";
import api from "../../services/api";

const PIE_COLORS = ["#e2a13a", "#3d7a68", "#3f8f5f", "#c15a4a", "#c99a3a", "#4a5170", "#b97e22"];

export default function AdminAnalyticsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/admin/analytics").then((res) => setData(res.data)).catch(() => setError("Could not load analytics."));
  }, []);

  if (error) {
    return (
      <DashboardLayout role="admin">
        <p className="text-sm text-[var(--color-stop)]">{error}</p>
      </DashboardLayout>
    );
  }
  if (!data) {
    return (
      <DashboardLayout role="admin">
        <p className="text-sm text-[var(--color-slate)]">Loading analytics…</p>
      </DashboardLayout>
    );
  }

  // Trim leading all-zero days so the sales/weight charts aren't mostly flat on a fresh dataset
  const salesTrend = trimLeadingZeros(data.sales_trend, "total_amount");
  const weightTrend = trimLeadingZeros(data.weight_loss_trend, "loading_weight_kg");

  return (
    <DashboardLayout role="admin">
      <h1 className="text-xl font-semibold text-[var(--color-ink)]">Analytics</h1>
      <p className="mt-1 text-sm text-[var(--color-slate)]">
        All charts render live database data — nothing hard-coded.
      </p>

      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Billed (all orders)" value={`₹${data.payments_summary.total_billed.toLocaleString("en-IN")}`} accent="amber" />
        <StatCard label="Collected" value={`₹${data.payments_summary.total_collected.toLocaleString("en-IN")}`} accent="go" />
        <StatCard label="Pending" value={`₹${data.payments_summary.total_pending.toLocaleString("en-IN")}`} accent="stop" />
        <StatCard label="Open emergencies" value={data.emergency_stats.open_emergencies} accent={data.emergency_stats.open_emergencies > 0 ? "stop" : "go"} />
      </div>

      {/* Sales trend */}
      <ChartCard title="Sales trend (last 30 days)">
        {salesTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={salesTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `₹${v.toLocaleString("en-IN")}`} />
              <Line type="monotone" dataKey="total_amount" name="Sales (₹)" stroke="var(--color-amber-deep)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <Empty />
        )}
      </ChartCard>

      {/* Market demand: area-wise + retailer-wise */}
      <div className="grid md:grid-cols-2 gap-5 mt-5">
        <ChartCard title="Area-wise demand (all time)">
          {data.market_demand.by_area.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.market_demand.by_area}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                <XAxis dataKey="area" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${v} KG`} />
                <Bar dataKey="quantity_kg" name="KG" fill="var(--color-route)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </ChartCard>

        <ChartCard title="Top retailers by demand">
          {data.market_demand.by_retailer.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.market_demand.by_retailer} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="retailer" tick={{ fontSize: 11 }} width={110} />
                <Tooltip formatter={(v) => `${v} KG`} />
                <Bar dataKey="quantity_kg" name="KG" fill="var(--color-amber)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </ChartCard>
      </div>

      {/* Order status + pricing */}
      <div className="grid md:grid-cols-2 gap-5 mt-5">
        <ChartCard title="Order status breakdown">
          {data.order_status_breakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={data.order_status_breakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={(d) => d.status}>
                  {data.order_status_breakdown.map((entry, i) => (
                    <Cell key={entry.status} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </ChartCard>

        <ChartCard title="Chicken rate history">
          {data.pricing_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.pricing_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} domain={["dataMin - 5", "dataMax + 5"]} />
                <Tooltip formatter={(v) => `₹${v}/KG`} />
                <Line type="monotone" dataKey="rate_per_kg" stroke="var(--color-amber-deep)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </ChartCard>
      </div>

      {/* Weight loss trend */}
      <ChartCard title="Loading vs delivery weight, weight loss (last 30 days)">
        {weightTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={weightTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="loading_weight_kg" name="Loaded (KG)" stroke="var(--color-route)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="delivery_weight_kg" name="Delivered (KG)" stroke="var(--color-go)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="weight_loss_kg" name="Loss (KG)" stroke="var(--color-stop)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <Empty />
        )}
      </ChartCard>

      {/* Transport performance */}
      <div className="grid md:grid-cols-2 gap-5 mt-5">
        <ChartCard title="Vehicle utilization">
          {data.transport_performance.vehicles.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.transport_performance.vehicles}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                <XAxis dataKey="vehicle_number" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} unit="%" />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="utilization_percent" name="Utilization %" fill="var(--color-route)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </ChartCard>

        <ChartCard title="Driver trips & earnings">
          {data.transport_performance.drivers.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.transport_performance.drivers}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                <XAxis dataKey="driver_name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="completed_trips" name="Completed trips" fill="var(--color-amber)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </ChartCard>
      </div>

      {/* Emergency stats */}
      <ChartCard title="Emergency breakdown by type">
        {data.emergency_stats.by_problem_type.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.emergency_stats.by_problem_type}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
              <XAxis dataKey="problem_type" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="Cases" fill="var(--color-stop)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Empty label="No emergencies reported — nothing to chart." />
        )}
      </ChartCard>
    </DashboardLayout>
  );
}

function trimLeadingZeros(rows, key) {
  const firstNonZero = rows.findIndex((r) => r[key] > 0);
  return firstNonZero === -1 ? [] : rows.slice(firstNonZero);
}

function ChartCard({ title, children }) {
  return (
    <div className="mt-5 bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5">
      <p className="text-xs uppercase tracking-wide text-[var(--color-slate)] mb-3">{title}</p>
      {children}
    </div>
  );
}

function Empty({ label = "No data yet." }) {
  return <p className="text-sm text-[var(--color-slate)] py-10 text-center">{label}</p>;
}
