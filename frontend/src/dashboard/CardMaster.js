import React, { useState, useEffect } from 'react';
import './dashboard.css';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_URL = 'http://localhost:5000';

const CardMaster = () => {
  const [cards, setCards] = useState([]);
  const [form, setForm] = useState({ memberid: '', membername: '' });
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Fetch cards from backend
  const fetchCards = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/cards`);
      const data = await res.json();
      setCards(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to fetch cards');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (editId) {
        // Update card
        const res = await fetch(`${API_URL}/cards/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberid: form.memberid, membername: form.membername }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to update card');
        }
      } else {
        // Add card
        const res = await fetch(`${API_URL}/cards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to add card');
        }
      }
      setForm({ memberid: '', membername: '' });
      setEditId(null);
      fetchCards();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleEdit = (card) => {
    setForm({ memberid: card.memberid, membername: card.membername });
    setEditId(card._id);
  };

  const handleDelete = async (id) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/cards/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete card');
      }
      fetchCards();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // Filter cards by search
  const filteredCards = cards.filter(card =>
    card.memberid.toLowerCase().includes(search.toLowerCase()) ||
    card.membername.toLowerCase().includes(search.toLowerCase())
  );

  // Export to Excel
  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredCards.map(c => ({ 'Member ID': c.memberid, 'Member Name': c.membername })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cards');
    XLSX.writeFile(wb, 'cards.xlsx');
  };

  // Export to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const dateStr = new Date().toLocaleString();
    doc.setFontSize(18);
    doc.text('Card List', 14, 18);
    doc.setFontSize(10);
    doc.text(`Exported: ${dateStr}`, 14, 26);
    autoTable(doc, {
      head: [['Member ID', 'Member Name']],
      body: filteredCards.map(c => [c.memberid, c.membername]),
      startY: 32,
      theme: 'grid',
      headStyles: { fillColor: [25, 118, 210], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 12, cellPadding: 3 },
      margin: { left: 14, right: 14 },
    });
    doc.save('cards.pdf');
  };

  return (
    <div className="usermaster-container-bw">
      <h1>Card Master</h1>
      <form className="usermaster-form-bw" onSubmit={handleSubmit} autoComplete="off">
        <input
          type="text"
          name="memberid"
          placeholder="Member ID"
          value={form.memberid}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="membername"
          placeholder="Member Name"
          value={form.membername}
          onChange={handleChange}
          required
        />
        <button type="submit" disabled={loading}>
          {editId ? 'Update Card' : 'Add Card'}
        </button>
        {editId && (
          <button type="button" className="cancel-btn-bw" onClick={() => { setEditId(null); setForm({ memberid: '', membername: '' }); }}>
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
            placeholder="Search member id or name..."
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
        <h2>Current Cards</h2>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div style={{ maxHeight: '350px', overflowY: 'auto', width: '100%' }}>
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Member ID</th>
                  <th>Member Name</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCards.sort((a, b) => a.memberid.localeCompare(b.memberid)).map(card => (
                  <tr key={card._id}>
                    <td>{card.memberid}</td>
                    <td>{card.membername}</td>
                    <td>
                      <button className="icon-btn-bw" title="Edit" onClick={() => handleEdit(card)}>
                        <svg className="icon-edit-bw" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5z"/></svg>
                      </button>
                      <button className="icon-btn-bw" title="Delete" onClick={() => handleDelete(card._id)}>
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

export default CardMaster; 