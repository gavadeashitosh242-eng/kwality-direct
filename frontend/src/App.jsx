import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import LoginPage from "./pages/LoginPage";

import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminRetailersPage from "./pages/admin/AdminRetailersPage";
import AdminDriversPage from "./pages/admin/AdminDriversPage";
import AdminVehiclesPage from "./pages/admin/AdminVehiclesPage";
import AdminAreasPage from "./pages/admin/AdminAreasPage";
import AdminChickenRatesPage from "./pages/admin/AdminChickenRatesPage";
import AdminRoutesPage from "./pages/admin/AdminRoutesPage";
import AdminDispatchPage from "./pages/admin/AdminDispatchPage";
import AdminTripsPage from "./pages/admin/AdminTripsPage";
import AdminFareRatePage from "./pages/admin/AdminFareRatePage";
import AdminWeightLossPage from "./pages/admin/AdminWeightLossPage";
import AdminDriverFaresPage from "./pages/admin/AdminDriverFaresPage";
import AdminEmergenciesPage from "./pages/admin/AdminEmergenciesPage";
import AdminPaymentsPage from "./pages/admin/AdminPaymentsPage";
import AdminInvoicesPage from "./pages/admin/AdminInvoicesPage";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage";

import RetailerDashboardPage from "./pages/retailer/RetailerDashboardPage";
import PlaceOrderPage from "./pages/retailer/PlaceOrderPage";
import MyOrdersPage from "./pages/retailer/MyOrdersPage";
import RetailerPaymentsPage from "./pages/retailer/RetailerPaymentsPage";

import DriverDashboardPage from "./pages/driver/DriverDashboardPage";
import DriverTripsPage from "./pages/driver/DriverTripsPage";
import DriverFarePage from "./pages/driver/DriverFarePage";
import DriverPerformancePage from "./pages/driver/DriverPerformancePage";

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}`} replace />;
}

function Admin({ children }) {
  return <ProtectedRoute allowedRoles={["admin"]}>{children}</ProtectedRoute>;
}
function Retailer({ children }) {
  return <ProtectedRoute allowedRoles={["retailer"]}>{children}</ProtectedRoute>;
}
function Driver({ children }) {
  return <ProtectedRoute allowedRoles={["driver"]}>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />

          <Route path="/admin" element={<Admin><AdminDashboardPage /></Admin>} />
          <Route path="/admin/orders" element={<Admin><AdminOrdersPage /></Admin>} />
          <Route path="/admin/retailers" element={<Admin><AdminRetailersPage /></Admin>} />
          <Route path="/admin/drivers" element={<Admin><AdminDriversPage /></Admin>} />
          <Route path="/admin/vehicles" element={<Admin><AdminVehiclesPage /></Admin>} />
          <Route path="/admin/areas" element={<Admin><AdminAreasPage /></Admin>} />
          <Route path="/admin/chicken-rates" element={<Admin><AdminChickenRatesPage /></Admin>} />
          <Route path="/admin/routes" element={<Admin><AdminRoutesPage /></Admin>} />
          <Route path="/admin/dispatch" element={<Admin><AdminDispatchPage /></Admin>} />
          <Route path="/admin/trips" element={<Admin><AdminTripsPage /></Admin>} />
          <Route path="/admin/fare-rate" element={<Admin><AdminFareRatePage /></Admin>} />
          <Route path="/admin/weight-loss" element={<Admin><AdminWeightLossPage /></Admin>} />
          <Route path="/admin/driver-fares" element={<Admin><AdminDriverFaresPage /></Admin>} />
          <Route path="/admin/emergencies" element={<Admin><AdminEmergenciesPage /></Admin>} />
          <Route path="/admin/payments" element={<Admin><AdminPaymentsPage /></Admin>} />
          <Route path="/admin/invoices" element={<Admin><AdminInvoicesPage /></Admin>} />
          <Route path="/admin/analytics" element={<Admin><AdminAnalyticsPage /></Admin>} />

          <Route path="/retailer" element={<Retailer><RetailerDashboardPage /></Retailer>} />
          <Route path="/retailer/place-order" element={<Retailer><PlaceOrderPage /></Retailer>} />
          <Route path="/retailer/orders" element={<Retailer><MyOrdersPage /></Retailer>} />
          <Route path="/retailer/payments" element={<Retailer><RetailerPaymentsPage /></Retailer>} />

          <Route path="/driver" element={<Driver><DriverDashboardPage /></Driver>} />
          <Route path="/driver/trips" element={<Driver><DriverTripsPage /></Driver>} />
          <Route path="/driver/fare" element={<Driver><DriverFarePage /></Driver>} />
          <Route path="/driver/performance" element={<Driver><DriverPerformancePage /></Driver>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
