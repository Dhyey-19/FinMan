import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './login/Login';
import Dashboard from './dashboard/dashboard';
import './App.css';
import UserMaster from './dashboard/UserMaster';
import CardMaster from './dashboard/CardMaster';
import LoanMaster from './dashboard/LoanMaster';
import InstallmentManager from './dashboard/InstallmentManager';
import CreditInstallment from './dashboard/CreditInstallment';
import Reports from './dashboard/Reports';
import AboutUs from './dashboard/AboutUs';
import { DashboardHome } from './dashboard/dashboard';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('authToken');
  return token ? children : <Navigate to="/" />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>}>
          <Route index element={<DashboardHome />} />
          <Route path="user-master" element={<UserMaster />} />
          <Route path="card-master" element={<CardMaster />} />
          <Route path="loan-master" element={<LoanMaster />} />
          <Route path="installment-manager" element={<InstallmentManager />} />
          <Route path="credit-installment" element={<CreditInstallment />} />
          <Route path="reports" element={<Reports />} />
          <Route path="about-us" element={<AboutUs />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
