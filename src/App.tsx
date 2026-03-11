import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { Navbar, Footer } from "./components/Layout";
import Home from "./pages/Home";
import Product from "./pages/Product";
import Pricing from "./pages/Pricing";
import Download from "./pages/Download";
import Cloud from "./pages/Cloud";
import Docs from "./pages/Docs";
import Market from "./pages/Market";
import Login from "./pages/Login";
import AppHomePage from "./pages/AppHome";
import BillingPage from "./pages/Billing";
import AccountPage from "./pages/Account";
import SupportPage from "./pages/Support";
import SelfHostedConsolePage from "./pages/SelfHostedConsole";
import AdminPage from "./pages/Admin";
import MockCheckoutPage from "./pages/MockCheckout";
import { useEffect, type ReactNode } from "react";
import { LanguageProvider } from "./context/LanguageContext";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function MainLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isAuthPage = location.pathname === "/login" || location.pathname === "/signup";

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-black selection:text-white">
      {!isAuthPage && <Navbar />}
      <main>{children}</main>
      {!isAuthPage && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <Router>
        <ScrollToTop />
        <MainLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/product" element={<Product />} />
            <Route path="/products" element={<Product />} />
            <Route path="/products/self-hosted" element={<Download />} />
            <Route path="/products/cloud" element={<Cloud />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/download" element={<Download />} />
            <Route path="/cloud" element={<Cloud />} />
            <Route path="/portal" element={<Cloud />} />
            <Route path="/app" element={<AppHomePage />} />
            <Route path="/app/billing" element={<BillingPage />} />
            <Route path="/app/account" element={<AccountPage />} />
            <Route path="/app/support" element={<SupportPage />} />
            <Route path="/app/admin" element={<AdminPage />} />
            <Route path="/app/cloud" element={<Cloud />} />
            <Route path="/app/cloud/onboarding" element={<Cloud />} />
            <Route path="/app/cloud/session" element={<Cloud />} />
            <Route path="/app/self-hosted" element={<SelfHostedConsolePage />} />
            <Route path="/app/self-hosted/downloads" element={<SelfHostedConsolePage />} />
            <Route path="/app/self-hosted/config" element={<SelfHostedConsolePage />} />
            <Route path="/checkout/mock" element={<MockCheckoutPage />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/market" element={<Market />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Login defaultMode="register" />} />
          </Routes>
        </MainLayout>
      </Router>
    </LanguageProvider>
  );
}
