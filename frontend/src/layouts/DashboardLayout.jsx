import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation, Link } from "react-router-dom";
import NotificationBell from "../components/NotificationBell";

// Phase built (linked to a real route) vs. planned (Phase 3+, shown but inert)
const NAV = {
  admin: [
    { label: "Dashboard", to: "/admin" },
    { label: "Orders", to: "/admin/orders" },
    { label: "Retailers", to: "/admin/retailers" },
    { label: "Drivers", to: "/admin/drivers" },
    { label: "Vehicles", to: "/admin/vehicles" },
    { label: "Areas", to: "/admin/areas" },
    { label: "Chicken Rates", to: "/admin/chicken-rates" },
    { label: "Routes", to: "/admin/routes" },
    { label: "Dispatch", to: "/admin/dispatch" },
    { label: "Trips", to: "/admin/trips" },
    { label: "Weight Loss", to: "/admin/weight-loss" },
    { label: "Driver Fares", to: "/admin/driver-fares" },
    { label: "Fare Rate", to: "/admin/fare-rate" },
    { label: "Payments", to: "/admin/payments" },
    { label: "Invoices", to: "/admin/invoices" },
    { label: "Emergencies", to: "/admin/emergencies" },
    { label: "Backup Vehicles", to: "/admin/vehicles" },
    { label: "Reports", to: "/admin/analytics" },
    { label: "Analytics", to: "/admin/analytics" },
    { label: "Settings", to: null },
  ],
  retailer: [
    { label: "Dashboard", to: "/retailer" },
    { label: "Place Order", to: "/retailer/place-order" },
    { label: "My Orders", to: "/retailer/orders" },
    { label: "Current Rate", to: "/retailer" },
    { label: "Payments", to: "/retailer/payments" },
    { label: "Profile", to: null },
  ],
  driver: [
    { label: "Dashboard", to: "/driver" },
    { label: "My Profile", to: "/driver" },
    { label: "Today's Trip", to: "/driver" },
    { label: "Trip History", to: "/driver/trips" },
    { label: "My Fare", to: "/driver/fare" },
    { label: "My Performance", to: "/driver/performance" },
    { label: "Emergency", to: "/driver" },
  ],
};

const ROLE_LABEL = { admin: "Admin / Company", retailer: "Retailer", driver: "Driver" };

export default function DashboardLayout({ role, children }) {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const items = NAV[role] || [];

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen flex bg-[var(--color-canvas)]">
      <aside className="w-60 shrink-0 bg-[var(--color-ink)] text-white flex flex-col">
        <div className="px-5 py-5 border-b border-white/10">
          <p className="text-xs tracking-[0.2em] uppercase text-[var(--color-amber)]">Kwality Direct</p>
          <p className="mt-1 text-sm text-white/70">{ROLE_LABEL[role]}</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {items.map((item) => {
            const active = item.to && location.pathname === item.to;
            const base = "w-full block text-left px-5 py-2.5 text-sm transition-colors";
            if (!item.to) {
              return (
                <span
                  key={item.label}
                  title="Coming in a later phase"
                  className={`${base} text-white/30 cursor-default`}
                >
                  {item.label}
                </span>
              );
            }
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`${base} ${
                  active
                    ? "bg-white/10 text-white border-l-2 border-[var(--color-amber)]"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-4 border-t border-white/10 text-xs text-white/50">
          Signed in as <span className="text-white/80">{user?.username}</span>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center justify-between px-6 border-b border-[var(--color-line)] bg-[var(--color-panel)]">
          <p className="text-sm text-[var(--color-slate)]">
            {profile?.shop_name || profile?.full_name || "Overview"}
          </p>
          <div className="flex items-center gap-4">
            {(role === "admin" || role === "driver") && <NotificationBell role={role} />}
            <button
              onClick={handleLogout}
              className="text-sm text-[var(--color-ink)] hover:text-[var(--color-stop)] transition-colors"
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
