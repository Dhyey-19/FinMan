import React, { useState, useEffect } from 'react';
import './dashboard.css';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_URL = 'http://localhost:5000';

const Reports = () => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Fetch all loans
  const fetchLoans = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_URL}/loans`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      setLoans(Array.isArray(data) ? data : []);
    } catch (err) {
      // Error handling can be added if needed
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  // Filter loans by memberid or membername, and only show active loans (status = true)
  const filteredLoans = loans.filter(loan =>
    loan.status === true && ( // Only show active loans
      loan.membername.toLowerCase().includes(search.toLowerCase()) ||
      loan.memberid.toLowerCase().includes(search.toLowerCase())
    )
  );

  // Export to Excel
  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredLoans.map(l => ({
      'Loan No': l.loanno,
      'Member ID': l.memberid,
      'Member Name': l.membername,
      'Loan Amount': l.loanamount,
      'Loan Date': l.loandate ? new Date(l.loandate).toLocaleDateString() : '',
      'EDI': l.edi,
      'NOI': l.noi,
      'Paid Amount': l.paidamount,
      'Interest Income': l.interestincome,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Loans');
    XLSX.writeFile(wb, 'loans.xlsx');
  };

  // Export to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const dateStr = new Date().toLocaleString();
    doc.setFontSize(18);
    doc.text('Loan Reports', 14, 18);
    doc.setFontSize(10);
    doc.text(`Exported: ${dateStr}`, 14, 26);
    autoTable(doc, {
      head: [['Loan No', 'Member ID', 'Member Name', 'Loan Amount', 'Loan Date', 'EDI', 'NOI', 'Paid Amount', 'Interest Income']],
      body: filteredLoans.map(l => [
        l.loanno,
        l.memberid,
        l.membername,
        l.loanamount,
        l.loandate ? new Date(l.loandate).toLocaleDateString() : '',
        l.edi,
        l.noi,
        l.paidamount,
        l.interestincome
      ]),
      startY: 32,
      theme: 'grid',
      headStyles: { fillColor: [25, 118, 210], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 12, cellPadding: 3 },
      margin: { left: 14, right: 14 },
    });
    doc.save('loans.pdf');
  };


  return (
    <div className="usermaster-container-bw">
      <h1>Loan Reports</h1>
      <div className="usermaster-form-bw" style={{ marginBottom: 24, justifyContent: 'space-between', display: 'flex' }}>
        <input
          type="text"
          placeholder="Search by Member Name or Member ID"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, maxWidth: 320 }}
        />
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
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
        <h2>Active Loans (Completed loans are hidden)</h2>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Loan No</th>
                <th>Member ID</th>
                <th>Member Name</th>
                <th>Loan Amount</th>
                <th>Loan Date</th>
                <th>EDI</th>
                <th>NOI</th>
                <th>Paid Amount</th>
                <th>Interest Income</th>
              </tr>
            </thead>
            <tbody>
              {filteredLoans.map((loan, idx) => (
                <tr key={idx}>
                  <td>{loan.loanno}</td>
                  <td>{loan.memberid}</td>
                  <td>{loan.membername}</td>
                  <td>{loan.loanamount}</td>
                  <td>{loan.loandate ? new Date(loan.loandate).toLocaleDateString() : ''}</td>
                  <td>{loan.edi}</td>
                  <td>{loan.noi}</td>
                  <td>{loan.paidamount}</td>
                  <td>{loan.interestincome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Reports;
