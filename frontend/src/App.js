import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "./config/wagmi";
import { Toaster } from "@/components/ui/sonner";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import VPNConnect from "./pages/VPNConnect";
import VPNConnectEnhanced from "./pages/VPNConnectEnhanced";
import NodeManagement from "./pages/NodeManagement";
import Staking from "./pages/Staking";
import StakingEnhanced from "./pages/StakingEnhanced";
import PremiumPage from "./pages/PremiumPage";
import DesignSystemShowcase from "./pages/DesignSystemShowcase";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import "@/App.css";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vpn"
        element={
          <ProtectedRoute>
            <VPNConnect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/nodes"
        element={
          <ProtectedRoute>
            <NodeManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staking"
        element={
          <ProtectedRoute>
            <Staking />
          </ProtectedRoute>
        }
      />
      <Route
        path="/premium"
        element={
          <ProtectedRoute>
            <PremiumPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/design-system"
        element={<DesignSystemShowcase />}
      />
    </Routes>
  );
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <div className="App">
              <AppRoutes />
              <Toaster position="top-right" />
            </div>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;