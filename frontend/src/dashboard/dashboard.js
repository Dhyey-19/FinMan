// src/dashboard/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import './dashboard.css';
import { PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, Legend } from 'recharts';

const menuData = [
  {
    label: 'Dashboard',
    icon: '🏠',
    path: '/dashboard',
    submenu: null,
  },
  {
    label: 'Master',
    icon: '🗂️',
    submenu: [
      { label: 'User Master', path: '/dashboard/user-master' },
      { label: 'New Card', path: '/dashboard/card-master' },
      { label: 'New Loan', path: '/dashboard/loan-master' },
      { label: 'Create/Delete Installment', path: '/dashboard/installment-manager' },
    ],
  },
  {
    label: 'Transaction',
    icon: '💳',
    submenu: [
      { label: 'Credit Installment', path: '/dashboard/credit-installment' },
    ],
  },
  {
    label: 'Reports',
    icon: '📊',
    path: '/dashboard/reports',
    submenu: null,
  },
  {
    label: 'About Us',
    icon: 'ℹ️',
    path: '/dashboard/about-us',
    submenu: null,
  },
];

const SidebarMenu = ({ onLogout, username }) => {
  const [openMenu, setOpenMenu] = useState(null);
  const navigate = useNavigate();
  return (
    <div className="sidebar-bw">
      <div className="profile-section-bw">
        <img
          src="https://randomuser.me/api/portraits/men/32.jpg"
          alt="Profile"
          className="profile-img-bw"
        />
        <div className="profile-info-bw">
          <div className="profile-name-bw">{username || 'User'}</div>
          <div className="profile-status-bw">
            <span className="status-dot-bw" /> Online
          </div>
        </div>
      </div>
      <div className="menu-section-bw">
        {menuData.map((item) => (
          <div key={item.label}>
            <div
              className={`menu-item-bw${openMenu === item.label ? ' open' : ''}`}
              onClick={() => {
                if (!item.submenu) {
                  if (item.path) navigate(item.path);
                } else {
                  setOpenMenu(openMenu === item.label ? null : item.label);
                }
              }}
            >
              <span className="menu-icon-bw">{item.icon}</span>
              <span>{item.label}</span>
              {item.submenu && (
                <span className="arrow-bw">{openMenu === item.label ? '▲' : '▼'}</span>
              )}
            </div>
            {item.submenu && (
              <div
                className={`submenu-bw${openMenu === item.label ? ' show' : ''}`}
                style={{ maxHeight: openMenu === item.label ? '500px' : '0' }}
              >
                {item.submenu.map((sub, idx) => (
                  <div
                    className="submenu-item-bw"
                    key={sub.label + idx}
                    onClick={() => navigate(sub.path)}
                  >
                    {sub.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <button className="logout-btn-bw" onClick={onLogout}>
        Logout
      </button>
    </div>
  );
};

const COLORS = ['#388e3c', '#1976d2', '#fbc02d', '#d32f2f', '#7b1fa2'];

function getPaidVsOutstanding(loans) {
  let paid = 0, outstanding = 0;
  loans.forEach(loan => {
    paid += Number(loan.paidamount) || 0;
    const total = Number(loan.loanamount) || 0;
    outstanding += Math.max(0, total - (Number(loan.paidamount) || 0));
  });
  return [
    { name: 'Paid', value: paid },
    { name: 'Outstanding', value: outstanding }
  ];
}

function getTopMembers(loans) {
  const map = {};
  loans.forEach(loan => {
    map[loan.membername] = (map[loan.membername] || 0) + (Number(loan.loanamount) || 0);
  });
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

const DashboardHome = () => {
  const [summary, setSummary] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('authToken');
        const [summaryRes, loansRes] = await Promise.all([
          fetch('http://localhost:5000/dashboard/summary', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('http://localhost:5000/loans', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);
        const summaryData = await summaryRes.json();
        const loansData = await loansRes.json();
        if (!summaryRes.ok) throw new Error(summaryData.error || 'Failed to fetch summary');
        if (!loansRes.ok) throw new Error(loansData.error || 'Failed to fetch loans');
        setSummary(summaryData);
        setLoans(Array.isArray(loansData) ? loansData : []);
      } catch (err) {
        setError('Failed to fetch dashboard data');
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return <div className="dashboard-loading">Loading dashboard...</div>;
  if (error) return <div className="dashboard-error">{error}</div>;
  if (!summary) return null;

  // Prepare chart data
  const paidVsOutstanding = getPaidVsOutstanding(loans);
  const topMembers = getTopMembers(loans);

  return (
    <div className="dashboard-home">
      <h1>Dashboard Overview</h1>
      <div className="dashboard-summary-cards">
        <div className="summary-card">
          <div className="summary-icon">💰</div>
          <div className="summary-title">Total Paid Amount</div>
          <div className="summary-value">₹{summary.totalPaidAmount.toLocaleString()}</div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">📈</div>
          <div className="summary-title">Total Interest Income</div>
          <div className="summary-value">₹{summary.totalInterestIncome.toLocaleString()}</div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">👥</div>
          <div className="summary-title">Total Cards</div>
          <div className="summary-value">{summary.totalCards}</div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">📋</div>
          <div className="summary-title">Loans Active</div>
          <div className="summary-value">{summary.activeLoans}</div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">✅</div>
          <div className="summary-title">Loans Closed</div>
          <div className="summary-value">{summary.closedLoans}</div>
        </div>
      </div>
      <div className="dashboard-graphs" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 32 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px #eee' }}>
          <h3 style={{ marginBottom: 16 }}>Paid vs Outstanding</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={paidVsOutstanding} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                {paidVsOutstanding.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px #eee' }}>
          <h3 style={{ marginBottom: 16 }}>Top 5 Members by Loan Amount</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topMembers} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#7b1fa2" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  useEffect(() => {
    setUsername(localStorage.getItem('username') || '');
  }, []);
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    navigate('/');
  };
  return (
    <div className="dashboard-container-bw">
      <SidebarMenu onLogout={handleLogout} username={username} />
      <div className="dashboard-content-bw">
        <Outlet />
      </div>
    </div>
  );
};

export { DashboardHome };
export default Dashboard;
