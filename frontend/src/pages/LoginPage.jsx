import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const user = await login(username, password);
      navigate(`/${user.role}`);
    } catch {
      // error already surfaced via auth context
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[var(--color-canvas)]">
      {/* Left: brand panel with route-line signature */}
      <div className="hidden lg:flex flex-col justify-between bg-[var(--color-ink)] text-white p-12 relative overflow-hidden">
        <RouteLines />
        <div className="relative z-10">
          <p className="text-sm tracking-[0.2em] uppercase text-[var(--color-amber)]">Kwality Direct</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight max-w-sm">
            Company to retailer.<br />No middle stop.
          </h1>
        </div>
        <div className="relative z-10 text-sm text-white/60 max-w-sm">
          Orders, routes, vehicles, drivers and weight loss — one system, one source of truth.
        </div>
      </div>

      {/* Right: login form */}
      <div className="flex items-center justify-center p-8">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-8 shadow-sm"
        >
          <h2 className="text-2xl font-semibold text-[var(--color-ink)]">Sign in</h2>
          <p className="mt-1 text-sm text-[var(--color-slate)]">
            Admin, retailer, and driver logins all live here.
          </p>

          <label className="block mt-6 text-sm font-medium text-[var(--color-ink)]">
            Username
            <input
              className="mt-1 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-amber)] focus:ring-2 focus:ring-[var(--color-amber)]/30"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
            />
          </label>

          <label className="block mt-4 text-sm font-medium text-[var(--color-ink)]">
            Password
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-amber)] focus:ring-2 focus:ring-[var(--color-amber)]/30"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error && (
            <p className="mt-4 text-sm text-[var(--color-stop)] bg-[var(--color-stop)]/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-[var(--color-amber)] hover:bg-[var(--color-amber-deep)] transition-colors text-white font-medium py-2.5 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <div className="mt-6 text-xs text-[var(--color-slate)] leading-relaxed">
            Demo accounts — admin / admin123 · retailer1 / retailer123 · driver1 / driver123
          </div>
        </form>
      </div>
    </div>
  );
}

function RouteLines() {
  // Signature element: a dotted delivery-route path connecting depot -> stops,
  // echoing the area-wise routing that's core to the product.
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-40"
      viewBox="0 0 500 700"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <path
        d="M40 620 C 140 560, 120 460, 220 420 S 340 300, 300 220 S 420 120, 460 60"
        fill="none"
        stroke="var(--color-amber)"
        strokeWidth="2"
        strokeDasharray="1 10"
        strokeLinecap="round"
      />
      <circle cx="40" cy="620" r="6" fill="var(--color-amber)" />
      <circle cx="220" cy="420" r="4" fill="var(--color-route)" />
      <circle cx="300" cy="220" r="4" fill="var(--color-route)" />
      <circle cx="460" cy="60" r="6" fill="var(--color-route)" />
    </svg>
  );
}
