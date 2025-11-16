import React, { useState, useEffect } from 'react';
import './dashboard.css';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_URL = 'http://localhost:5000';

const UserMaster = () => {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: '', password: '' });
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [search, setSearch] = useState('');

  // Fetch users from backend (ordered by username)
  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/users`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to fetch users');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    console.log('Users:', users);
  }, [users]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (editId) {
        // Update user
        const res = await fetch(`${API_URL}/users/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: form.username, password: form.password }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to update user');
        }
      } else {
        // Add user
        const res = await fetch(`${API_URL}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to add user');
        }
      }
      setForm({ username: '', password: '' });
      setEditId(null);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleEdit = (user) => {
    setForm({ username: user.username, password: user.plainPassword || '' });
    setEditId(user._id);
  };

  const handleDelete = async (id) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete user');
      }
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // Filter users by search
  const filteredUsers = users.filter(user => user.username.toLowerCase().includes(search.toLowerCase()));

  // Export to Excel
  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredUsers.map(u => ({ Username: u.username, Password: u.plainPassword || '' })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    XLSX.writeFile(wb, 'users.xlsx');
  };

  // Export to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const dateStr = new Date().toLocaleString();
    doc.setFontSize(18);
    doc.text('User List', 14, 18);
    doc.setFontSize(10);
    doc.text(`Exported: ${dateStr}`, 14, 26);
    autoTable(doc, {
      head: [['Username', 'Password']],
      body: filteredUsers.map(u => [u.username, u.plainPassword || '']),
      startY: 32,
      theme: 'grid',
      headStyles: { fillColor: [25, 118, 210], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 12, cellPadding: 3 },
      margin: { left: 14, right: 14 },
    });
    doc.save('users.pdf');
  };

  return (
    <div className="usermaster-container-bw">
      <h1>User Master</h1>
      <form className="usermaster-form-bw" onSubmit={handleSubmit} autoComplete="off">
        <input
          type="text"
          name="username"
          placeholder="Username"
          value={form.username}
          onChange={handleChange}
          required
        />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder={editId ? "New Password (leave blank to keep)" : "Password"}
            value={form.password}
            onChange={handleChange}
            required={!editId}
            style={{ paddingRight: 32 }}
          />
          <button
            type="button"
            className="icon-btn-bw icon-eye-bw"
            style={{ position: 'absolute', right: 4, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            tabIndex={-1}
            onClick={() => setShowPassword(v => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.06 10.06 0 0 1 12 20C7 20 2.73 16.11 1 12c.73-1.67 2.07-3.76 4.06-5.94M9.88 9.88A3 3 0 0 1 12 9c1.66 0 3 1.34 3 3 0 .41-.08.8-.22 1.16" /><path d="M1 1l22 22" /></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></svg>
            )}
          </button>
        </div>
        <button type="submit" disabled={loading}>
          {editId ? 'Update User' : 'Add User'}
        </button>
        {editId && (
          <button type="button" className="cancel-btn-bw" onClick={() => { setEditId(null); setForm({ username: '', password: '' }); }}>
            Cancel
          </button>
        )}
      </form>
      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
      <div style={{
        marginBottom: 16,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap'
      }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 320 }}>
          <input
            type="text"
            className="usermaster-search-bw"
            placeholder="Search username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 36px 8px 36px', borderRadius: 8, border: '1px solid #ccc', fontSize: '1rem' }}
          />
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="icon-btn-bw export-btn-bw" onClick={handleExportExcel} title="Export to Excel" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#e8f5e9', border: '1px solid #388e3c', borderRadius: 8, padding: '8px 16px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#388e3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9l6 6M15 9l-6 6"/></svg>
            <span style={{ fontWeight: 500, color: '#222' }}>Excel</span>
          </button>
          <button className="icon-btn-bw export-btn-bw" onClick={handleExportPDF} title="Download PDF" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ffebee', border: '1px solid #d32f2f', borderRadius: 8, padding: '8px 16px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d32f2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 8h8v8H8z"/><path d="M8 16l8-8"/></svg>
            <span style={{ fontWeight: 500, color: '#222' }}>PDF</span>
          </button>
        </div>
      </div>
      <div className="usermaster-list-bw">
        <h2>Current Users</h2>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div style={{ maxHeight: '350px', overflowY: 'auto', width: '100%' }}>
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Password</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.sort((a, b) => a.username.localeCompare(b.username)).map(user => (
                  <tr key={user._id}>
                    <td>{user.username}</td>
                    <td>{user.plainPassword || ''}</td>
                    <td>
                      <button className="icon-btn-bw" title="Edit" onClick={() => handleEdit(user)}>
                        <svg className="icon-edit-bw" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5z"/></svg>
                      </button>
                      <button className="icon-btn-bw" title="Delete" onClick={() => handleDelete(user._id)}>
                        <svg className="icon-delete-bw" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserMaster; 