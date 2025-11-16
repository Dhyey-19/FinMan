import React, { useState, useEffect } from 'react';
import './dashboard.css';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_URL = 'http://localhost:5000';

const InstallmentManager = () => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [editingLoan, setEditingLoan] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [cards, setCards] = useState([]);
  const [showDateInput, setShowDateInput] = useState(false);
  const [selectedLoanForDate, setSelectedLoanForDate] = useState(null);
  const [newLoanDate, setNewLoanDate] = useState('');

  // Fetch all loans
  const fetchLoans = async () => {
    setLoading(true);
    setError('');
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
      setError('Failed to fetch loans');
    }
    setLoading(false);
  };

  // Fetch cards for member selection
  const fetchCards = async () => {
    try {
      const res = await fetch(`${API_URL}/cards`);
      const data = await res.json();
      setCards(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch cards');
    }
  };

  // Test API endpoints to ensure they exist
  const testAPIEndpoints = async () => {
    try {
      // Test server connectivity first
      const healthRes = await fetch(`${API_URL}/health`);
      if (!healthRes.ok) {
        setError('Warning: Backend server connectivity issues detected. Some features may not work properly.');
        return;
      }
      // If health check passes, clear any previous errors
      setError('');
    } catch (err) {
      setError('Warning: Cannot connect to backend server. Please ensure the server is running on port 5000.');
    }
  };



  useEffect(() => {
    fetchLoans();
    fetchCards();
    testAPIEndpoints(); // Test API endpoints on component mount
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
    doc.text('Installment Manager', 14, 18);
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
    doc.save('installments.pdf');
  };

  // Print PDF for specific loan
  const handlePrint = async (loan) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/transactions?loanno=${loan.loanno}`);
      if (!res.ok) {
        throw new Error('Failed to fetch transactions');
      }
      const transactionData = await res.json();
      
             if (!Array.isArray(transactionData) || transactionData.length === 0) {
         setError('No transactions found for this loan. Please create transactions first using the Create button.');
         setLoading(false);
         return;
       }
       
       // Generate PDF immediately after data is loaded
       generateMemberCardPDF(loan, transactionData);
      
    } catch (err) {
      setError('Failed to generate PDF: ' + err.message);
    }
    setLoading(false);
  };

  const generateMemberCardPDF = (loan, transactionData) => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
             // Set page dimensions
       const pageWidth = doc.internal.pageSize.getWidth();
       const margin = 15;
      const contentWidth = pageWidth - (2 * margin);
      
      // Header - Finance Manager and Member Name
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Finance Manager', margin, 20);
      doc.text(loan.membername, margin, 28);
      
      // Main Title - Member Card
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text('Member Card', pageWidth / 2, 25, { align: 'center' });
      
      // Subtitle - Loan ID
      doc.setFontSize(12);
      doc.text('Loan ID', pageWidth - margin - 30, 20);
      doc.text(loan.loanno.toString(), pageWidth - margin - 30, 28);
      
      // Use actual NOI from loan record, not hardcoded value
      const noi = parseInt(loan.noi);
      
      // Validate that we have the correct number of transactions
      if (transactionData.length !== noi) {
        console.warn(`Warning: Expected ${noi} transactions but found ${transactionData.length}`);
        console.warn('This might cause the PDF to show incorrect number of rows');
      }
      
      // Split NOI into two parts for two-column layout
      const firstHalf = Math.ceil(noi / 2);
      const secondHalf = noi - firstHalf;
      
             // Calculate table dimensions
       const tableStartY = 40;
       const leftTableX = margin;
      const rightTableX = pageWidth / 2 + 5;
      const tableWidth = (contentWidth - 10) / 2;
      
      // Column widths
      const colWidths = [8, 25, 20, 20]; // No, Inst. Date, Amount, Paid Date
      
      // First half table (left side) - Show exactly firstHalf rows
      if (transactionData.length > 0) {
        const firstHalfTransactions = transactionData.slice(0, firstHalf);
        
        drawCompactTable(doc, firstHalfTransactions, leftTableX, tableStartY, tableWidth, colWidths, 1, 'left');
      }
      
      // Second half table (right side) - Show exactly secondHalf rows
      if (secondHalf > 0 && transactionData.length > firstHalf) {
        const secondHalfTransactions = transactionData.slice(firstHalf, firstHalf + secondHalf);
        
        drawCompactTable(doc, secondHalfTransactions, rightTableX, tableStartY, tableWidth, colWidths, firstHalf + 1, 'right');
      }
      
      // Open PDF in new window
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
      
    } catch (err) {
      setError('Failed to generate PDF: ' + err.message);
    }
  };

  // Draw compact table optimized for single page
  const drawCompactTable = (doc, tableData, startX, startY, tableWidth, colWidths, startNumber, side) => {
    try {
      
      // Define table dimensions
      const headerHeight = 6;
      const rowHeight = 5;
      
      // Table header
      doc.setFillColor(25, 118, 210);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      
      const headerY = startY;
      let currentX = startX;
      
      // Draw header background
      doc.rect(startX, headerY - 3, tableWidth, headerHeight, 'F');
      
      // Draw header text
      doc.text('No', currentX + 2, headerY + 1);
      currentX += colWidths[0];
      doc.text('Inst. Date', currentX + 2, headerY + 1);
      currentX += colWidths[1];
      doc.text('Amount', currentX + 2, headerY + 1);
      currentX += colWidths[2];
      doc.text('Paid Date', currentX + 2, headerY + 1);
      
      // Reset text color for data
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(7);
      
      // Draw data rows
      tableData.forEach((row, index) => {
        const rowY = headerY + headerHeight + (index * rowHeight);
        
        // Draw row background (alternating)
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(startX, rowY - 2, tableWidth, rowHeight, 'F');
        }
        
        // Draw cell borders
        doc.setDrawColor(200, 200, 200);
        doc.rect(startX, rowY - 2, tableWidth, rowHeight);
        
        // Draw vertical column separators
        let separatorX = startX;
        colWidths.forEach((width, colIndex) => {
          if (colIndex < colWidths.length - 1) {
            separatorX += width;
            doc.line(separatorX, rowY - 2, separatorX, rowY - 2 + rowHeight);
          }
        });
        
        // Draw data
        currentX = startX;
        
        // Serial Number
        doc.text((startNumber + index).toString(), currentX + 2, rowY + 1);
        currentX += colWidths[0];
        
        // Installment Date
        const dateStr = new Date(row.installmentdate).toLocaleDateString('en-GB'); // DD-MM-YYYY format
        doc.text(dateStr, currentX + 2, rowY + 1);
        currentX += colWidths[1];
        
        // Amount
        doc.text(row.amount.toString(), currentX + 2, rowY + 1);
        currentX += colWidths[2];
        
        // Paid Date
        const paidDateStr = row.paiddate ? new Date(row.paiddate).toLocaleDateString('en-GB') : '';
        doc.text(paidDateStr, currentX + 2, rowY + 1);
      });
      
    } catch (err) {
      console.error(`Error drawing compact table for ${side} side:`, err);
    }
  };



  // Edit functionality
  const handleEdit = (loan) => {
    setEditingLoan(loan);
    setEditForm({
      loanno: loan.loanno,
      memberid: loan.memberid,
      membername: loan.membername,
      loanamount: loan.loanamount,
      loandate: loan.loandate ? new Date(loan.loandate).toISOString().slice(0, 10) : '',
      edi: loan.edi,
      noi: loan.noi,
      paidamount: loan.paidamount,
      interestincome: loan.interestincome
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'memberid') {
      // Find the selected member card to get the member name
      const selectedCard = cards.find(card => card.memberid === value);
      if (selectedCard) {
        setEditForm(prev => ({ 
          ...prev, 
          memberid: value,
          membername: selectedCard.membername 
        }));
      } else {
        setEditForm(prev => ({ ...prev, memberid: value }));
      }
    } else {
      setEditForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/loans/${editingLoan._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update loan');
      }
      setSuccess('Loan updated successfully!');
      setEditingLoan(null);
      setEditForm({});
      fetchLoans();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleEditCancel = () => {
    setEditingLoan(null);
    setEditForm({});
    setError('');
  };

  // Delete functionality
  const handleDelete = (loan) => {
    setDeleteConfirm(loan);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      
      // First delete all transactions for this loan
      const deleteTransactionsRes = await fetch(`${API_URL}/transactions/deleteByLoan`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanno: deleteConfirm.loanno })
      });
      
      if (!deleteTransactionsRes.ok) {
        const deleteData = await deleteTransactionsRes.text(); // Use text() first to see what's returned
        
        try {
          const deleteJson = JSON.parse(deleteData);
        } catch (e) {
        }
        // Continue with loan deletion even if transaction deletion fails
      } else {
        const deleteData = await deleteTransactionsRes.json();
      }
      
      // Then delete the loan
      const res = await fetch(`${API_URL}/loans/${deleteConfirm._id}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) {
        const data = await res.text(); // Use text() first to see what's returned
        
        try {
          const jsonData = JSON.parse(data);
          throw new Error(jsonData.error || 'Failed to delete loan');
        } catch (e) {
          if (data.includes('<!DOCTYPE') || data.includes('<html')) {
            throw new Error('Server returned HTML instead of JSON. Please check if the backend server is running on port 5000.');
          }
          throw new Error(`Failed to delete loan. Server returned: ${data}`);
        }
      }
      
      const deleteData = await res.json();
      
      setSuccess('Loan and all associated transactions deleted successfully!');
      setDeleteConfirm(null);
      fetchLoans();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  // Create transaction functionality
  const handleCreate = async (loan) => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      
      // Create new transactions with the current loan date
      // The backend will automatically clear existing transactions and create new ones
      const createRes = await fetch(`${API_URL}/transactions/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanno: loan.loanno,
          noi: loan.noi,
          loandate: loan.loandate,
          edi: loan.edi
        })
      });
      
      if (!createRes.ok) {
        const data = await createRes.text(); // Use text() first to see what's returned
        
        try {
          const jsonData = JSON.parse(data);
          throw new Error(jsonData.error || 'Failed to create transactions');
        } catch (e) {
          // If it's not JSON, it might be an HTML error page
          if (data.includes('<!DOCTYPE') || data.includes('<html')) {
            throw new Error('Server returned HTML instead of JSON. Please check if the backend server is running on port 5000.');
          }
          throw new Error(`Failed to create transactions. Server returned: ${data}`);
        }
      }
      
      const createData = await createRes.json();
      
      setSuccess(`Created ${loan.noi} transaction records for loan ${loan.loanno}!`);
      fetchLoans(); // Refresh the loans list
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleCreateWithDate = async () => {
    if (!selectedLoanForDate || !newLoanDate) {
      setError('Please select a valid date');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      
      // Update the loan date first
      
      // Create a clean update object with the new loan date
      const updateData = {
        loanno: selectedLoanForDate.loanno,
        memberid: selectedLoanForDate.memberid,
        membername: selectedLoanForDate.membername,
        loanamount: selectedLoanForDate.loanamount,
        loandate: newLoanDate, // Use the new date
        edi: selectedLoanForDate.edi,
        noi: selectedLoanForDate.noi,
        paidamount: selectedLoanForDate.paidamount,
        interestincome: selectedLoanForDate.interestincome
      };
      
      const updateLoanRes = await fetch(`${API_URL}/loans/${selectedLoanForDate._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      if (!updateLoanRes.ok) {
        const data = await updateLoanRes.text(); // Use text() first to see what's returned
        
        try {
          const jsonData = JSON.parse(data);
          throw new Error(jsonData.error || 'Failed to update loan date');
        } catch (e) {
          if (data.includes('<!DOCTYPE') || data.includes('<html')) {
            throw new Error('Server returned HTML instead of JSON. Please check if the backend server is running on port 5000.');
          }
          throw new Error(`Failed to update loan date. Server returned: ${data}`);
        }
      }
      
      const updateResponse = await updateLoanRes.json();
      
      // Create new transactions with the new date
      // The backend will automatically clear existing transactions and create new ones
      const createRes = await fetch(`${API_URL}/transactions/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanno: selectedLoanForDate.loanno,
          noi: selectedLoanForDate.noi,
          loandate: newLoanDate, // Use the new date
          edi: selectedLoanForDate.edi
        })
      });
      
      if (!createRes.ok) {
        const data = await createRes.text(); // Use text() first to see what's returned
        
        try {
          const jsonData = JSON.parse(data);
          throw new Error(jsonData.error || 'Failed to create transactions. Please check if the backend API is working correctly.');
        } catch (e) {
          if (data.includes('<!DOCTYPE') || data.includes('<html')) {
            throw new Error('Server returned HTML instead of JSON. Please check if the backend server is running on port 5000.');
          }
          throw new Error(`Failed to create transactions. Server returned: ${data}`);
        }
      }
      
      const createData = await createRes.json();
      
      setSuccess(`Reset loan with new start date ${newLoanDate} and created ${selectedLoanForDate.noi} new transaction records for loan ${selectedLoanForDate.loanno}!`);
      setShowDateInput(false);
      setSelectedLoanForDate(null);
      setNewLoanDate('');
      fetchLoans(); // Refresh the loans list to show updated date
      
      // Clear any previous errors
      setTimeout(() => {
        setError('');
      }, 5000);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleCancelDateInput = () => {
    setShowDateInput(false);
    setSelectedLoanForDate(null);
    setNewLoanDate('');
    setError('');
  };

  // Reset functionality
  const handleReset = (loan) => {
    setSelectedLoanForDate(loan);
    setNewLoanDate(new Date().toISOString().slice(0, 10)); // Default to today's date
    setShowDateInput(true);
  };

  if (editingLoan) {
    return (
      <div className="loanmaster-fadein-bw" style={{ maxWidth: 800, marginLeft: 0, marginRight: 'auto', padding: '32px 0 0 0' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 24, color: '#222', letterSpacing: 1, textAlign: 'left' }}>Edit Loan</h1>
        <form className="loanmaster-form-bw" onSubmit={handleEditSubmit} autoComplete="off" style={{ textAlign: 'left' }}>
          <div className="loanmaster-grid-bw" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Row 1: Loan No & Loan Amount */}
            <div className="loanmaster-field-bw">
              <label htmlFor="loanno">Loan No<span className="loanmaster-required-bw">*</span></label>
              <input
                type="text"
                id="loanno"
                name="loanno"
                placeholder="Loan No"
                value={editForm.loanno}
                onChange={handleEditChange}
                required
                pattern="[A-Za-z0-9]+"
                title="Alphanumeric only"
              />
            </div>
            <div className="loanmaster-field-bw">
              <label htmlFor="loanamount">Loan Amount<span className="loanmaster-required-bw">*</span></label>
              <input
                type="number"
                id="loanamount"
                name="loanamount"
                placeholder="Loan Amount"
                value={editForm.loanamount}
                onChange={handleEditChange}
                required
                min="0"
                step="0.01"
              />
            </div>
            {/* Row 2: Member ID & Member Name */}
            <div className="loanmaster-field-bw">
              <label htmlFor="memberid">Member ID<span className="loanmaster-required-bw">*</span></label>
              <select
                id="memberid"
                name="memberid"
                value={editForm.memberid}
                onChange={handleEditChange}
                required
              >
                {cards.map(card => (
                  <option key={card._id} value={card.memberid}>{card.memberid}</option>
                ))}
              </select>
            </div>
            <div className="loanmaster-field-bw">
              <label htmlFor="membername">Member Name</label>
              <input
                type="text"
                id="membername"
                name="membername"
                placeholder="Member Name"
                value={editForm.membername}
                readOnly
                tabIndex={-1}
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
            </div>
            {/* Row 3: Loan Date & Number of Installments */}
            <div className="loanmaster-field-bw">
              <label htmlFor="loandate">Loan Date<span className="loanmaster-required-bw">*</span></label>
              <input
                type="date"
                id="loandate"
                name="loandate"
                value={editForm.loandate}
                onChange={handleEditChange}
                required
              />
            </div>
            <div className="loanmaster-field-bw">
              <label htmlFor="noi">No. of Installments<span className="loanmaster-required-bw">*</span></label>
              <input
                type="number"
                id="noi"
                name="noi"
                placeholder="No. of Installments"
                value={editForm.noi}
                onChange={handleEditChange}
                required
                min="1"
              />
            </div>
            {/* Row 4: EDI & Paid Amount */}
            <div className="loanmaster-field-bw">
              <label htmlFor="edi">EDI</label>
              <input
                type="text"
                id="edi"
                name="edi"
                placeholder="EDI"
                value={editForm.edi}
                readOnly
                tabIndex={-1}
              />
            </div>
            <div className="loanmaster-field-bw">
              <label htmlFor="paidamount">Paid Amount</label>
              <input
                type="number"
                id="paidamount"
                name="paidamount"
                placeholder="Paid Amount"
                value={editForm.paidamount}
                onChange={handleEditChange}
                min="0"
                step="0.01"
              />
            </div>
            {/* Row 5: Interest Income (full width) */}
            <div className="loanmaster-field-bw" style={{ gridColumn: '1 / span 2' }}>
              <label htmlFor="interestincome">Interest Income</label>
              <input
                type="text"
                id="interestincome"
                name="interestincome"
                placeholder="Interest Income"
                value={editForm.interestincome}
                readOnly
                tabIndex={-1}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="submit" className="loanmaster-submit-bw loanmaster-submit-black-bw" disabled={loading}>
              {loading ? 'Updating...' : 'Update Loan'}
            </button>
            <button 
              type="button" 
              onClick={handleEditCancel}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#6c757d',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#e9ecef';
                e.target.style.borderColor = '#adb5bd';
                e.target.style.color = '#495057';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#f8f9fa';
                e.target.style.borderColor = '#dee2e6';
                e.target.style.color = '#6c757d';
              }}
            >
              Cancel
            </button>
          </div>
          {error && <div className="loanmaster-error-bw">{error}</div>}
          {success && <div className="loanmaster-success-bw">{success}</div>}
        </form>
      </div>
    );
  }

  return (
    <div className="usermaster-container-bw">
      <h1>Installment Manager</h1>
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
                <th>Options</th>
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
                  <td style={{ display: 'flex', gap: 8 }}>
                    <button className="icon-btn-bw" title="Edit" onClick={() => handleEdit(loan)}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1976d2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5z"/></svg>
                    </button>
                    <button className="icon-btn-bw" title="Create Transactions" onClick={() => handleCreate(loan)}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#388e3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                    </button>
                    <button className="icon-btn-bw" title="Print" onClick={() => handlePrint(loan)}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9c27b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6,9 6,2 18,2 18,9"/><path d="M6,18H4a2,2,0,0,1-2-2V11a2,2,0,0,1,2-2H20a2,2,0,0,1,2,2v5a2,2,0,0,1-2,2H18"/><polyline points="6,14,6,18,18,18,18,14"/></svg>
                    </button>
                    <button className="icon-btn-bw" title="Reset with New Date" onClick={() => handleReset(loan)}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff9800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                    </button>
                    <button className="icon-btn-bw" title="Delete" onClick={() => handleDelete(loan)}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d32f2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '400px',
            textAlign: 'center'
          }}>
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete loan <strong>{deleteConfirm.loanno}</strong>?</p>
            <p>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
              <button
                onClick={confirmDelete}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  background: '#d32f2f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={cancelDelete}
                style={{
                  padding: '8px 16px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date Input Modal for Create Transactions */}
      {showDateInput && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '8px',
            maxWidth: '450px',
            textAlign: 'center'
          }}>
            <h3>Reset Loan with New Date</h3>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              Enter a new start date for loan <strong>{selectedLoanForDate?.loanno}</strong>.<br/>
              This will update the loan date and recreate all transaction records from the new date.
            </p>
            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="newLoanDate" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                New Start Date:
              </label>
              <input
                type="date"
                id="newLoanDate"
                value={newLoanDate}
                onChange={(e) => setNewLoanDate(e.target.value)}
                style={{
                  padding: '10px',
                  fontSize: '14px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  width: '100%',
                  maxWidth: '200px'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={handleCreateWithDate}
                disabled={loading || !newLoanDate}
                style={{
                  padding: '10px 20px',
                  background: '#388e3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {loading ? 'Processing...' : 'Reset with New Date'}
              </button>
              <button
                onClick={handleCancelDateInput}
                style={{
                  padding: '10px 20px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
      {success && <div style={{ color: 'green', marginTop: 10 }}>{success}</div>}
    </div>
  );
};

export default InstallmentManager; 