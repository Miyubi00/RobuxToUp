import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TopUpPage from './pages/TopUpPage';
import StatusPage from './pages/StatusPage';
import GuidePage from './pages/GuidePage';
import PaymentStatusPage from './pages/PaymentStatusPage';
import LoginPage from './pages/LoginPage'; // IMPORT LOGIN
import AdminDashboard from './pages/AdminDashboard'; // IMPORT ADMIN
import Navbar from './components/Navbar';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-brand-navy text-white selection:bg-brand-pink selection:text-brand-navy">
        <Navbar />
        <div className="pt-24 container mx-auto px-4">
          <Routes>
            <Route path="/" element={<TopUpPage />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/guide" element={<GuidePage />} />
            
            {/* PAYMENT ROUTES */}
            <Route path="/payment/success" element={<PaymentStatusPage status="success" />} />
            <Route path="/payment/failed" element={<PaymentStatusPage status="failed" />} />
            <Route path="/payment/pending" element={<PaymentStatusPage status="pending" />} />
            
            {/* ADMIN ROUTES */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<AdminDashboard />} />

          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;