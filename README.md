# Kwality Direct — Smart Poultry Distribution & Transport Management System

Phases 1–2 of the system described in the master project prompt: React
frontend, Flask backend, SQLite database, JWT auth, server-enforced
role-based access, and now core business CRUD + the order/rate-snapshot
engine.

## What's built so far

**Phase 1 — Foundation**
- Flask app factory, modular structure (`models/`, `routes/`, `auth/`,
  `business_logic/`), SQLAlchemy models, JWT login, and a `roles_required()`
  decorator enforcing access **on the server** — verified live (retailer/
  driver hitting admin-only or each other's endpoints get real `403`s).
- React (Vite) + Tailwind, login page, auth context, protected routing.

**Phase 2 — Core Business**
- **Admin CRUD**: Retailers (create + approve/block), Drivers (create + set
  status), Vehicles (create + status), Areas — all with real forms wired to
  the API, tested end-to-end.
- **Chicken rate management**: set today's rate, see full history as a line
  chart.
- **Orders with rate-snapshotting** — the core business rule from the spec:
  an order permanently stores the rate that was live when it was placed.
  I verified this directly: placed an order at ₹145/KG, changed the daily
  rate to ₹150/KG, and confirmed the first order still shows ₹145,000 total
  while a new order correctly picks up ₹150/KG.
- **Retailer order flow**: place an order (area + quantity, live rate
  shown, estimated total calculated), and a "My Orders" history page scoped
  server-side to that retailer only — verified a second retailer cannot see
  the first retailer's orders even by direct API call.
- **Admin Orders page**: every retailer's orders in one place — the direct
  market visibility that replaces the broker.

**Phase 3 — Smart Distribution**
- **Area-wise demand grouping** (`GET /admin/orders/area-summary`): confirmed
  orders summed per delivery area, e.g. Panaji → 3000 KG.
- **Routes**: admin groups nearby areas into a practical route with a
  delivery sequence (e.g. Chandgad → Panaji → Old Goa → Mapusa).
- **Capacity-aware vehicle packing** — the core rule from the spec: never
  activate a second vehicle while the current one still has usable capacity.
  Verified directly: 3000 KG of orders against a 2000 KG + 1500 KG vehicle
  fleet produced exactly 2 trips (1500 KG and 1500 KG), never a wasteful
  3rd vehicle.
- **Fair round-robin driver rotation** — verified across three dispatch
  rounds: driver1 → driver2 → driver1, with unavailable drivers skipped but
  never dropped from the queue.
- **One-click Dispatch page**: shows today's area-wise demand, runs the
  full grouping → packing → rotation flow, and displays the resulting
  trips (vehicle, driver, load, orders).
- **Trips page**: every dispatched trip with its vehicle, driver, route,
  and load vs. capacity.

**Phase 4 — Transport**
- **Driver's real trip view**: today's assigned trip, delivery sequence,
  vehicle/route info — driven entirely by data, no placeholders.
- **Trip lifecycle**: `driver_assigned → loaded → in_transit → delivered`,
  enforced server-side (e.g. you can't record a delivery before a loading
  weight exists — verified by hitting `/deliver` before `/load` and getting
  a real business-rule error, not a silent no-op).
- **Automatic weight-loss calculation**: Loading − Delivery, and the
  percentage, computed the moment a driver confirms delivery.
- **Two separate driver financial records** (updated after initial build to
  match the correct business rule): weight-loss amount and driver fare are
  calculated independently and never summed —
  `weight_loss_amount = weight_loss × weight_loss_rate` (a penalty/recovery
  record), `driver_fare = delivered_weight × driver_fare_rate` (the
  driver's actual pay, based only on what was delivered, never on loaded
  weight or the loss). Both rates are snapshotted per trip so a later rate
  change never rewrites a completed trip's numbers. Verified end-to-end
  through the full HTTP stack (Vite proxy → Flask) with the canonical
  example: 1000 KG loaded, 900 KG delivered, ₹20/KG loss rate, ₹10/KG fare
  rate → 100 KG loss → ₹2,000 weight-loss amount + ₹9,000 driver fare (not
  ₹11,000). Also verified: 1000/1000 (no loss) → ₹0 loss amount, ₹10,000
  fare; over-delivery rejected; and rates changed after a trip completes
  leave that trip's stored numbers untouched.
- **Driver isolation**: confirmed a driver hitting another driver's
  `/trips/<id>/load` endpoint gets a genuine 404, not their data.
- **Vehicle & driver return to the pool**: on delivery, both flip back to
  `available` and the driver re-enters rotation automatically.
- **Driver pages**: My Fare (history + monthly/all-time totals), My
  Performance (trips, KG transported, avg loss %, earnings), Trip History.
- **Admin pages**: Fare Rate (set + history), Weight Loss report
  (driver/vehicle/route breakdown, >5% flagged), Driver Fares (all drivers,
  total payout).

**Phase 5 — Emergency**
- **Driver-initiated emergency reporting**: a driver on a `loaded` or
  `in_transit` trip can report Vehicle Breakdown / Accident / Engine Problem
  / Tyre Problem / Other with location and notes. This flags the trip,
  driver, and vehicle as `emergency` — it does **not** cancel the trip.
- **Nearest-suitable-backup search**: admin assigns a backup vehicle that is
  actually marked `is_backup` and has enough capacity for the remaining
  load, plus a backup driver picked by the same fair rotation used for
  normal dispatch.
- **Load transfer, trip continues**: verified end-to-end — 1500 KG in
  transit, driver reports a tyre problem, admin assigns backup vehicle
  GA-09-EF-9999, and the trip resumes `in_transit` under the new
  vehicle/driver with the full 1500 KG transferred, never cancelled.
- **Resolve case**: once the original vehicle/driver situation is sorted,
  admin resolves the case and both return to the `available` pool —
  verified they don't reset if a backup already took over.
- **Emergency isolation**: the admin dashboard shows a live open-emergencies
  count; retailers get a real 403 on the emergency endpoints.
- **Driver UI**: an "Emergency / Request backup" button appears exactly when
  a trip is loaded or in transit, with a short reporting form.
- **Admin UI**: Emergencies page listing every case with Assign Backup /
  Resolve actions and the resulting backup assignment shown inline.

**Emergency Notification System** (added after initial Phase 5 build)
- **In-app notifications, stored in the DB** — survive refresh, scoped per
  recipient. Verified: Admin gets `EMERGENCY_REPORTED` the instant a driver
  reports one; the assigned backup driver gets `EMERGENCY_BACKUP_ASSIGNED`;
  both (plus the original driver) get `EMERGENCY_RESOLVED` when it's closed;
  Admin gets `EMERGENCY_NO_BACKUP_AVAILABLE` if no backup vehicle/driver
  exists. All fetched through a real endpoint after a full page-refresh
  equivalent (fresh token, fresh request) — not just held in memory.
- **Notification bell** on the Admin and Driver dashboards — unread badge,
  click-to-mark-read, "mark all read," polls every 15s so it self-updates.
- **Backup driver selection hardened**: explicitly excludes the original
  reporting driver, and — verified with a real two-emergency scenario — the
  same backup vehicle is never double-assigned to two active emergencies at
  once (the second correctly gets "no backup available" instead).
- **Emergency Assignment card** on the driver dashboard: when you're
  someone else's backup, it's visually distinct (red-bordered) from your
  normal trip, shows the original driver/route/orders/weight, and has an
  "Accept emergency trip" action before you continue with the normal
  Load → Start → Deliver flow underneath.
- **Real bug found and fixed by this change**: the dashboard's "today's
  trip" lookup used `.first()` with no ordering, so a backup driver who
  already had an earlier trip that day could see the *wrong* (stale,
  already-delivered) trip instead of their new emergency assignment. Fixed
  to prefer the most recent non-terminal trip. This was directly exposed by
  testing the exact scenario the notification system needs to work for.
- **Security verified**: an unrelated third driver gets an empty emergency
  list and empty notification list for another driver's case; a driver
  cannot mark another driver's notification read (403); a driver cannot
  accept a backup assignment that isn't theirs.

**Phase 6 — Analytics**
- **Payments**: record a payment against any order (cash/UPI/bank
  transfer/cheque/other); paid/pending/status are always *derived* by
  summing payment rows, never stored as a separate column that could drift.
  Verified: partial → full payment progression, overpayment rejected,
  and a second retailer's payment list correctly shows nothing of the
  first retailer's.
- **Invoices**: generate a digital invoice for a delivered order (blocked
  for anything not yet delivered); calling generate twice returns the same
  invoice, never a duplicate. Company/retailer/quantity/rate/total are read
  live from the order's own permanently-snapshotted values, not copied.
  Verified a retailer can view their own invoice but gets a 404 for
  another retailer's.
- **Full analytics dashboard**: sales trend, area-wise and top-retailer
  demand, order status breakdown, chicken-rate history, loading vs.
  delivery weight trend, vehicle utilization, driver trips/earnings, and
  emergency breakdown by type — all rendered with Recharts from a single
  `/admin/analytics` endpoint, computed live from the database (verified:
  a fresh delivered order with a payment immediately showed up correctly
  in the sales trend and vehicle-utilization figures).
- **Retailer Payments page**: own orders' billed/paid/pending only.

## What's *not* built yet (by design — see the phased plan)

GPS/live location, real distance-based "nearest backup" search, AI demand
prediction, and SMS/WhatsApp/call delivery channels (the notification
model already has a `channel` field ready for this) are Phase 7.

## Project structure

```
kwality-direct/
  backend/
    app/
      models/         # User, Retailer, Driver, Vehicle, Area, ChickenRate, Order,
                       # Route, Trip/TripOrder, FareRate, WeightRecord, DriverFare,
                       # EmergencyCase, BackupAssignment, Notification, Payment, Invoice
      routes/         # Blueprints: auth, admin, retailer, driver
      auth/           # roles_required() decorator
      business_logic/ # order_service (rate-snapshot), onboarding_service,
                       # dispatch_service (grouping/packing/rotation),
                       # trip_service (load/start/deliver, weight-loss & fare calc),
                       # emergency_service (report/assign-backup/accept/resolve),
                       # notification_service (create/list/mark-read, scoped per user),
                       # payment_service (derive paid/pending from Payment rows),
                       # invoice_service (idempotent invoice generation),
                       # analytics_service (all chart aggregations, real data only)
      config/         # settings.py (dev/prod/test config)
      services/, utils/, migrations/, tests/  # empty, ready for Phase 7
    seed.py
    run.py
    requirements.txt
    .env.example
  frontend/
    src/
      pages/
        LoginPage.jsx
        admin/        # Dashboard, Orders, Retailers, Drivers, Vehicles, Areas,
                       # ChickenRates, Routes, Dispatch, Trips, FareRate,
                       # WeightLoss, DriverFares, Emergencies, Payments,
                       # Invoices, Analytics
        retailer/      # Dashboard, PlaceOrder, MyOrders, Payments
        driver/        # Dashboard (today's trip + load/start/deliver/emergency actions),
                       # Trips, Fare, Performance
      layouts/         # DashboardLayout (role-aware sidebar, real routes)
      context/         # AuthContext
      auth/            # ProtectedRoute
      services/        # api.js (axios + JWT interceptor)
      components/      # StatCard, DataTable, StatusBadge
    vite.config.js      # dev-server proxy: /api -> http://127.0.0.1:5000
```

## Running it locally

### 1. Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate   # optional but recommended
pip install -r requirements.txt
cp .env.example .env
python seed.py     # creates kwality.db with demo data
python run.py       # runs on http://127.0.0.1:5000
```

Demo logins created by `seed.py`:

| Role       | Username    | Password      |
|------------|-------------|---------------|
| Admin      | `admin`     | `admin123`    |
| Retailer 1 | `retailer1` | `retailer123` |
| Retailer 2 | `retailer2` | `retailer123` |
| Driver 1   | `driver1`   | `driver123`   |
| Driver 2   | `driver2`   | `driver123`   |

Two drivers and two vehicles (2000 KG / 1500 KG) are seeded so the Phase 3
capacity-packing and driver-rotation logic has something real to work
with — try placing a few orders over 2000 KG total in Panaji, confirming
them as admin, and running dispatch. Two separate rates are also seeded —
weight-loss rate ₹20/KG and driver fare rate ₹10/KG — so once you dispatch
a trip you can log in as that driver and run it through load → start
transit → deliver to see both the weight-loss amount and the driver fare
calculated independently and shown side by side. A third, backup-flagged
vehicle (GA-09-EF-9999, 2200 KG) is also seeded — once a trip is loaded or in
transit, that driver's dashboard shows an "Emergency / Request backup"
button; report one, then go to Admin → Emergencies to assign the backup
and watch the trip resume under the new vehicle/driver.

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev          # runs on http://127.0.0.1:5173
```

Open http://127.0.0.1:5173 — it proxies `/api/*` to the Flask backend
automatically (configured in `vite.config.js`), so no CORS setup is needed
in development.

### 3. Switching to PostgreSQL later

Only `backend/.env`'s `DATABASE_URL` needs to change, e.g.:

```
DATABASE_URL=postgresql://user:password@host:5432/kwality
```

No application code changes required — everything goes through the
SQLAlchemy ORM.

## Next: Phase 7 — Advanced

GPS/live driver location and map-based route visualization, real
distance-based backup-vehicle search (replacing today's lowest-vehicle-id
approximation), AI/ML demand prediction from historical order data, and
SMS/WhatsApp/phone-call delivery for the notification system (the
`Notification.channel` field is already there for this — only the delivery
integration itself is missing).
