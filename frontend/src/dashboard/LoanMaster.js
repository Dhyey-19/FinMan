import React, { useState, useEffect, useRef } from 'react';
import './dashboard.css';

const API_URL = 'http://localhost:5000';

const LoanMaster = () => {
  const [memberSuggestions, setMemberSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const suggestionRef = useRef(null);
  const [form, setForm] = useState({
    memberid: '',
    membername: '',
    loanamount: '',
    loandate: new Date().toISOString().slice(0, 10),
    edi: '',
    noi: 100,
    paidamount: '',
    interestincome: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');


  useEffect(() => {
    const loanamount = parseFloat(form.loanamount) || 0;
    const noi = parseFloat(form.noi) || 1;
    const paidamount = parseFloat(form.paidamount) || 0;
    setForm(f => ({
      ...f,
      edi: noi ? (loanamount / noi).toFixed(2) : '',
      interestincome: (loanamount - paidamount).toFixed(2)
    }));
  }, [form.loanamount, form.noi, form.paidamount]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchMembers = async (query) => {
    if (query.length < 2) {
      setMemberSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/cards/search?q=${encodeURIComponent(query)}`);
      const suggestions = await response.json();
      setMemberSuggestions(suggestions);
      setShowSuggestions(true);
    } catch (err) {
      console.error('Error searching members:', err);
    }
  };

  const handleMemberNameChange = (e) => {
    const value = e.target.value;
    setForm(f => ({ ...f, membername: value, memberid: '' }));
    setError('');

    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout for search
    const timeout = setTimeout(() => {
      searchMembers(value);
    }, 300);
    setSearchTimeout(timeout);
  };

  const handleMemberSelect = (member) => {
    setForm(f => ({ 
      ...f, 
      membername: member.membername, 
      memberid: member.memberid 
    }));
    setShowSuggestions(false);
    setMemberSuggestions([]);
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/loans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add loan');
      }
      const result = await res.json();
      setForm({
        memberid: '', membername: '', loanamount: '',
        loandate: new Date().toISOString().slice(0, 10), edi: '', noi: 100, paidamount: '', interestincome: ''
      });
      setSuccess(`Loan added successfully! Loan Number: ${result.loanno}`);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="loanmaster-fadein-bw" style={{ maxWidth: 700, marginLeft: 0, marginRight: 'auto', padding: '32px 0 0 0' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: 24, color: '#222', letterSpacing: 1, textAlign: 'left' }}>Add New Loan</h1>
      <form className="loanmaster-form-bw" onSubmit={handleSubmit} autoComplete="off" style={{ textAlign: 'left' }}>
        <div className="loanmaster-grid-bw" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Row 1: Member Name & Loan Amount */}
          <div className="loanmaster-field-bw" style={{ position: 'relative' }}>
            <label htmlFor="membername">Member Name<span className="loanmaster-required-bw">*</span></label>
            <input
              type="text"
              id="membername"
              name="membername"
              placeholder="Type member name..."
              value={form.membername}
              onChange={handleMemberNameChange}
              required
              autoComplete="off"
            />
            {showSuggestions && memberSuggestions.length > 0 && (
              <div 
                ref={suggestionRef}
                className="member-suggestions"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #ccc',
                  borderTop: 'none',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                {memberSuggestions.map((member, index) => (
                  <div
                    key={member._id}
                    onClick={() => handleMemberSelect(member)}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderBottom: index < memberSuggestions.length - 1 ? '1px solid #eee' : 'none'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    <div style={{ fontWeight: 'bold' }}>{member.membername}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="loanmaster-field-bw">
            <label htmlFor="loanamount">Loan Amount<span className="loanmaster-required-bw">*</span></label>
            <input
              type="number"
              id="loanamount"
              name="loanamount"
              placeholder="Loan Amount"
              value={form.loanamount}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
            />
          </div>
          {/* Row 3: Loan Date & Number of Installments */}
          <div className="loanmaster-field-bw">
            <label htmlFor="loandate">Loan Date<span className="loanmaster-required-bw">*</span></label>
            <input
              type="date"
              id="loandate"
              name="loandate"
              value={form.loandate}
              onChange={handleChange}
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
              value={form.noi}
              onChange={handleChange}
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
              value={form.edi}
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
              value={form.paidamount}
              onChange={handleChange}
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
              value={form.interestincome}
              readOnly
              tabIndex={-1}
            />
          </div>
        </div>
        <button type="submit" className="loanmaster-submit-bw loanmaster-submit-black-bw" disabled={loading}>Add Loan</button>
        {error && <div className="loanmaster-error-bw">{error}</div>}
        {success && <div className="loanmaster-success-bw">{success}</div>}
      </form>
    </div>
  );
};

export default LoanMaster; 