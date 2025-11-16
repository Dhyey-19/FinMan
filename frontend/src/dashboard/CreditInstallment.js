import React, { useState, useEffect } from 'react';
import './dashboard.css';

const API_URL = 'http://localhost:5000';

const CreditInstallment = () => {
  const [loans, setLoans] = useState([]);
  const [cards, setCards] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDistribution, setPaymentDistribution] = useState([]);
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));

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

  // Fetch all member cards (memberid + membername)
  const fetchCards = async () => {
    try {
      const res = await fetch(`${API_URL}/cards`);
      const data = await res.json();
      setCards(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to fetch members');
    }
  };

  // Fetch transactions for a specific loan
  const fetchTransactions = async (loanno) => {
    try {
      const res = await fetch(`${API_URL}/transactions?loanno=${loanno}`);
      if (!res.ok) {
        throw new Error('Failed to fetch transactions');
      }
      const data = await res.json();
      setTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to fetch transactions');
    }
  };

  useEffect(() => {
    fetchLoans();
    fetchCards();
  }, []);

  // Filter members and loans by global search
  const filteredMembers = cards.filter(card =>
    card.membername.toLowerCase().includes(search.toLowerCase()) ||
    card.memberid.toLowerCase().includes(search.toLowerCase())
  );
  const filteredLoans = loans.filter(loan =>
    loan.status === true && ( // Only show active loans
      loan.membername.toLowerCase().includes(search.toLowerCase()) ||
      loan.memberid.toLowerCase().includes(search.toLowerCase()) ||
      loan.loanno.toString().includes(search)
    )
  );

  // Loans for selected member
  const loansForSelectedMember = selectedMember
    ? filteredLoans.filter(l => l.memberid === selectedMember.memberid)
    : [];

  // Handle member selection
  const handleMemberSelect = (member) => {
    setSelectedMember(member);
    setSelectedLoan(null);
    setTransactions([]);
  };

  // Handle loan selection
  const handleLoanSelect = (loan) => {
    setSelectedLoan(loan);
    fetchTransactions(loan.loanno);
    setPaymentDistribution([]);
  };

  // Calculate payment distribution
  const calculatePaymentDistribution = (amount) => {
    if (!selectedLoan || !transactions.length) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setPaymentDistribution([]);
      return;
    }

    let remainingAmount = numAmount;
    const distribution = [];

    // Sort transactions by installment date (oldest first)
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(a.installmentdate) - new Date(b.installmentdate)
    );

    for (let i = 0; i < sortedTransactions.length; i++) {
      const transaction = sortedTransactions[i];
      const transactionAmount = transaction.amount;
      
      // Already paid: keep as previously paid, never update
      if (transaction.paiddate) {
        distribution.push({
          ...transaction,
          paymentAmount: transactionAmount, // show amount paid previously
          isPaid: true,
          wasPreviouslyPaid: true
        });
        continue;
      }

      // No partials allowed: pay full only if enough remains
      if (remainingAmount >= transactionAmount) {
        distribution.push({
          ...transaction,
          paymentAmount: transactionAmount,
          isPaid: true,
          wasPreviouslyPaid: false
        });
        remainingAmount -= transactionAmount;
      } else {
        distribution.push({
          ...transaction,
          paymentAmount: 0,
          isPaid: false,
          wasPreviouslyPaid: false
        });
      }
    }

    setPaymentDistribution(distribution);
  };

  // Handle payment amount change
  const handlePaymentAmountChange = (e) => {
    const amount = e.target.value;
    setPaymentAmount(amount);
    calculatePaymentDistribution(amount);
  };

  // Process payment
  const handleProcessPayment = async () => {
    if (!selectedLoan || !paymentAmount || paymentDistribution.length === 0) {
      setError('Please select a loan and enter payment amount');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Update transactions: only rows that are NOT previously paid and are fully paid now
      const rowsToUpdate = paymentDistribution.filter(
        (item) => !item.wasPreviouslyPaid && item.paymentAmount === item.amount
      );

      const updatePromises = rowsToUpdate.map((item) =>
        fetch(`${API_URL}/transactions/${item._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paiddate: paidDate,
          }),
        })
      );

      await Promise.all(updatePromises);

      // Note: We don't update the loan's paidamount field here
      // The paidamount in the loan record should remain fixed as set during loan creation
      const totalPaid = rowsToUpdate.reduce((sum, item) => sum + item.amount, 0);
      
      // Check if ALL transactions now have paiddate and mark loan as completed
      const updatedTransactions = await fetch(`${API_URL}/transactions?loanno=${selectedLoan.loanno}`).then(res => res.json());
      const allTransactionsPaid = updatedTransactions.length > 0 && updatedTransactions.every(t => t.paiddate);
      
      if (allTransactionsPaid && selectedLoan.status === true) {
        // Mark loan as completed
        await fetch(`${API_URL}/loans/${selectedLoan._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...selectedLoan,
            status: false, // Mark as completed
          }),
        });
        setSuccess(`Payment of ₹${totalPaid.toLocaleString()} processed successfully for date ${paidDate}! Loan marked as completed (all installments paid).`);
      } else {
        setSuccess(`Payment of ₹${totalPaid.toLocaleString()} processed successfully for date ${paidDate}!`);
      }
      setPaymentAmount('');
      setPaymentDistribution([]);
      setPaidDate(new Date().toISOString().slice(0, 10));
      setShowPaymentModal(false);
      
      // Refresh data
      fetchLoans();
      if (selectedLoan) {
        fetchTransactions(selectedLoan.loanno);
      }
    } catch (err) {
      setError('Failed to process payment: ' + err.message);
    }
    setLoading(false);
  };

  const handleCancelPayment = () => {
    setShowPaymentModal(false);
    setPaymentAmount('');
    setPaymentDistribution([]);
    setPaidDate(new Date().toISOString().slice(0, 10));
    setError('');
  };

  // Mark loan as closed
  const handleMarkAsClosed = async () => {
    if (!selectedLoan) {
      setError('Please select a loan to mark as closed');
      return;
    }

    if (selectedLoan.status === false) {
      setError('This loan is already closed');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // First, delete all transactions for this loan
      console.log('Deleting transactions for loan:', selectedLoan.loanno);
      const deleteTransactionsRes = await fetch(`${API_URL}/transactions/deleteByLoan`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanno: selectedLoan.loanno })
      });

      if (!deleteTransactionsRes.ok) {
        const deleteErrorText = await deleteTransactionsRes.text();
        console.warn('Warning: Failed to delete transactions:', deleteErrorText);
        // Continue with loan update even if transaction deletion fails
      } else {
        const deleteData = await deleteTransactionsRes.json();
        console.log('Transactions deleted:', deleteData);
      }

      // Then, mark the loan as closed
      const updateData = {
        ...selectedLoan,
        status: false, // Mark as closed
      };
      
      console.log('Sending update request for loan:', selectedLoan._id);
      console.log('Update data:', updateData);
      
      const updateLoanRes = await fetch(`${API_URL}/loans/${selectedLoan._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      console.log('Response status:', updateLoanRes.status);
      console.log('Response ok:', updateLoanRes.ok);

      if (!updateLoanRes.ok) {
        const errorText = await updateLoanRes.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to update loan status: ${errorText}`);
      }

      const responseData = await updateLoanRes.json();
      console.log('Success response:', responseData);

      setSuccess(`Loan ${selectedLoan.loanno} has been marked as closed and all transactions have been deleted!`);
      
      // Refresh data
      fetchLoans();
      setSelectedLoan(null);
      setTransactions([]);
    } catch (err) {
      console.error('Error marking loan as closed:', err);
      setError('Failed to mark loan as closed: ' + err.message);
    }
    setLoading(false);
  };

  // Derived totals for the currently selected loan
  const paidToDate = transactions
    .filter(t => t.paiddate)
    .reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : parseFloat(t.amount || 0)), 0);
  const outstanding = selectedLoan ? Math.max(0, (typeof selectedLoan.loanamount === 'number' ? selectedLoan.loanamount : parseFloat(selectedLoan.loanamount || 0)) - paidToDate) : 0;

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  // Format currency
  const formatCurrency = (amount) => {
    return parseFloat(amount).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR'
    });
  };

  return (
    <div className="usermaster-container-bw">
      <h1>Credit Installment - View Only</h1>
      
      <div className="usermaster-form-bw" style={{ marginBottom: 24, justifyContent: 'space-between', display: 'flex' }}>
        <input
          type="text"
          placeholder="Search by Member Name, Member ID, or Loan No"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, maxWidth: 400 }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            className="icon-btn-bw export-btn-bw" 
            onClick={() => setShowPaymentModal(true)}
            disabled={!selectedLoan}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6, 
              background: '#388e3c', 
              border: '1px solid #388e3c', 
              borderRadius: 8, 
              padding: '8px 16px',
              color: 'white',
              cursor: selectedLoan ? 'pointer' : 'not-allowed',
              opacity: selectedLoan ? 1 : 0.6
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span style={{ fontWeight: 500 }}>Process Payment</span>
          </button>
          <button 
            className="icon-btn-bw export-btn-bw" 
            onClick={handleMarkAsClosed}
            disabled={!selectedLoan}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6, 
              background: '#d32f2f', 
              border: '1px solid #d32f2f', 
              borderRadius: 8, 
              padding: '8px 16px',
              color: 'white',
              cursor: selectedLoan ? 'pointer' : 'not-allowed',
              opacity: selectedLoan ? 1 : 0.6
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12l2 2 4-4"/>
              <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
              <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
              <path d="M13 12h3a2 2 0 0 1 2 2v1"/>
              <path d="M13 12H9a2 2 0 0 0-2 2v1"/>
            </svg>
            <span style={{ fontWeight: 500 }}>Mark as Closed</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', height: 'calc(100vh - 130px)', minHeight: 0 }}>
        {/* Left Panel - Member and Loan Selection */}
        <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6', overflow: 'auto' }}>
          <h3 style={{ marginBottom: '20px', color: '#333' }}>Select Member</h3>

          <div style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '16px' }}>
            {filteredMembers.map((member, idx) => (
              <div
                key={idx}
                onClick={() => handleMemberSelect(member)}
                style={{
                  padding: '10px',
                  marginBottom: '8px',
                  background: selectedMember?.memberid === member.memberid ? '#e3f2fd' : 'white',
                  border: selectedMember?.memberid === member.memberid ? '2px solid #1976d2' : '1px solid #dee2e6',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: '#1976d2' }}>{member.memberid}</span>
                  <span style={{ fontSize: '13px', color: '#555' }}>{member.membername}</span>
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ marginBottom: '12px', color: '#333' }}>Loans</h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {loansForSelectedMember.length === 0 ? (
              <div style={{ color: '#777', fontSize: '14px' }}>
                {selectedMember ? 'No loans for this member' : 'Select a member to see loans'}
              </div>
            ) : (
              loansForSelectedMember.map((loan, idx) => (
                <div
                  key={idx}
                  onClick={() => handleLoanSelect(loan)}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    background: selectedLoan?._id === loan._id ? '#e8f5e9' : 'white',
                    border: selectedLoan?._id === loan._id ? '2px solid #4caf50' : '1px solid #dee2e6',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 600, color: '#2e7d32' }}>Loan #{loan.loanno}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Amount: {formatCurrency(loan.loanamount)}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Paid: {formatCurrency(loan.paidamount)}</div>
                </div>
              ))
            )}
          </div>

          {selectedLoan && (
            <div style={{ 
              background: '#e8f5e9', 
              padding: '16px', 
              borderRadius: '8px', 
              border: '1px solid #4caf50',
              marginTop: '16px'
            }}>
              <h3 style={{ marginBottom: '16px', color: '#2e7d32' }}>Selected Loan Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <strong>Loan ID:</strong> {selectedLoan.loanno}
                </div>
                <div>
                  <strong>Member ID:</strong> {selectedLoan.memberid}
                </div>
                <div>
                  <strong>Member Name:</strong> {selectedLoan.membername}
                </div>
                <div>
                  <strong>Loan Amount:</strong> {formatCurrency(selectedLoan.loanamount)}
                </div>
                <div>
                  <strong>Loan Date:</strong> {formatDate(selectedLoan.loandate)}
                </div>
                <div>
                  <strong>EDI:</strong> {formatCurrency(selectedLoan.edi)}
                </div>
                <div>
                  <strong>No. of Installments:</strong> {selectedLoan.noi}
                </div>
                <div>
                  <strong>Paid Amount:</strong> {formatCurrency(paidToDate)}
                </div>
                <div>
                  <strong>Outstanding:</strong> {formatCurrency(outstanding)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Transaction Details */}
        <div style={{ flex: 1, background: 'white', borderRadius: '8px', border: '1px solid #dee2e6', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
          <div style={{ 
            background: '#1976d2', 
            color: 'white', 
            padding: '12px 16px', 
            fontWeight: '600' 
          }}>
            Installment Details
          </div>
          
          {transactions.length > 0 ? (
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingBottom: '120px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Installment</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Installment Date</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Amount</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Paid Amount</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Paid Date</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px' }}>{idx + 1}</td>
                      <td style={{ padding: '12px' }}>{formatDate(transaction.installmentdate)}</td>
                      <td style={{ padding: '12px' }}>{formatCurrency(transaction.amount)}</td>
                      <td style={{ padding: '12px' }}>{formatCurrency(transaction.paiddate ? transaction.amount : 0)}</td>
                      <td style={{ padding: '12px' }}>{transaction.paiddate ? formatDate(transaction.paiddate) : '-'}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          background: transaction.paiddate ? '#e8f5e9' : '#fff3e0',
                          color: transaction.paiddate ? '#2e7d32' : '#f57c00'
                        }}>
                          {transaction.paiddate ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666', flex: 1 }}>
              {selectedLoan ? 'No transactions found for this loan' : 'Select a loan to view transactions'}
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
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
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ marginBottom: '20px', color: '#333' }}>Process Payment</h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="paymentAmount" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Payment Amount:
              </label>
              <input
                type="number"
                id="paymentAmount"
                value={paymentAmount}
                onChange={handlePaymentAmountChange}
                placeholder="Enter payment amount"
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '16px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="paidDate" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Paid Date:
              </label>
              <input
                type="date"
                id="paidDate"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '16px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>

            {paymentDistribution.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ marginBottom: '12px', color: '#555' }}>
                  Payment Distribution for Date: {formatDate(paidDate)}
                </h4>
                
                {/* Payment Summary */}
                <div style={{ 
                  background: '#f8f9fa', 
                  padding: '12px', 
                  borderRadius: '4px', 
                  marginBottom: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <strong>Previously Paid:</strong> {formatCurrency(
                      paymentDistribution
                        .filter(item => item.wasPreviouslyPaid)
                        .reduce((sum, item) => sum + item.amount, 0)
                    )}
                  </div>
                  <div>
                    <strong>New Payment:</strong> {formatCurrency(
                      paymentDistribution
                        .filter(item => !item.wasPreviouslyPaid && item.paymentAmount > 0)
                        .reduce((sum, item) => sum + item.paymentAmount, 0)
                    )}
                  </div>
                  <div>
                    <strong>Total:</strong> {formatCurrency(
                      paymentDistribution
                        .filter(item => item.wasPreviouslyPaid || item.paymentAmount > 0)
                        .reduce((sum, item) => sum + (item.wasPreviouslyPaid ? item.amount : item.paymentAmount), 0)
                    )}
                  </div>
                </div>
                
                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Installment</th>
                        <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Date</th>
                        <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Required</th>
                        <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Payment</th>
                        <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentDistribution.map((item, idx) => (
                        <tr key={idx} style={{ 
                          borderBottom: '1px solid #f0f0f0',
                          background: item.wasPreviouslyPaid ? '#f8f9fa' : 'transparent'
                        }}>
                          <td style={{ padding: '8px' }}>{idx + 1}</td>
                          <td style={{ padding: '8px' }}>{formatDate(item.installmentdate)}</td>
                          <td style={{ padding: '8px' }}>{formatCurrency(item.amount)}</td>
                          <td style={{ padding: '8px' }}>
                            {item.wasPreviouslyPaid ? 
                              formatCurrency(item.amount) + ' (Previously Paid)' : 
                              formatCurrency(item.paymentAmount)
                            }
                          </td>
                          <td style={{ padding: '8px' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontSize: '11px',
                              fontWeight: '500',
                              background: item.wasPreviouslyPaid ? '#e8f5e9' : item.paymentAmount > 0 ? '#fff3e0' : '#f5f5f5',
                              color: item.wasPreviouslyPaid ? '#2e7d32' : item.paymentAmount > 0 ? '#f57c00' : '#666'
                            }}>
                              {item.wasPreviouslyPaid ? 'Paid' : item.paymentAmount > 0 ? 'Partial' : 'None'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancelPayment}
                style={{
                  padding: '10px 20px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleProcessPayment}
                disabled={loading || !paymentAmount || paymentDistribution.length === 0}
                style={{
                  padding: '10px 20px',
                  background: '#388e3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'Processing...' : 'Process Payment'}
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

export default CreditInstallment;
