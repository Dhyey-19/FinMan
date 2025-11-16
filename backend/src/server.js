const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || '50cd1fc148db466693f2f541e95cf6f31dbbe325a49cfde72cc1f01a37ab7d494b5563091e3dcc60dc7448fc52db85076cc336c4b3d17e101acb261cfb56be8e';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/finman';
const PORT = process.env.PORT || 5000;

const app = express();
app.use(express.json());
app.use(cors());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  plainPassword: { type: String }, // Store plain password for demo only
});

const User = mongoose.model('User', userSchema);

// Signup route
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  try {
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword, plainPassword: password });
    await user.save();
    // Issue JWT on signup
    const token = jwt.sign({ username: user.username, id: user._id }, JWT_SECRET, { expiresIn: '1d' });
    res.status(201).json({ message: 'User registered successfully', token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'Invalid username or password' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid username or password' });
    // Issue JWT on login
    const token = jwt.sign({ username: user.username, id: user._id }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ message: 'Login successful', token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// JWT middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Get all users (ordered by username)
app.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, { username: 1, plainPassword: 1 }).sort({ username: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a new user
app.post('/users', async (req, res) => {
  const { username, password } = req.body;
  try {
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword, plainPassword: password });
    await user.save();
    res.status(201).json({ message: 'User added successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a user (username and/or password)
app.put('/users/:id', async (req, res) => {
  const { username, password } = req.body;
  try {
    const update = { username };
    if (password) {
      update.password = await bcrypt.hash(password, 10);
      update.plainPassword = password;
    }
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a user
app.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Card schema and model
const cardSchema = new mongoose.Schema({
  memberid: { type: String, required: true, unique: true },
  membername: { type: String, required: true }
});
const Card = mongoose.model('Card', cardSchema);

// Get all cards (ordered by memberid)
app.get('/cards', async (req, res) => {
  try {
    const cards = await Card.find({}, { memberid: 1, membername: 1 }).sort({ memberid: 1 });
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Search members by name (for autocomplete)
app.get('/cards/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json([]);
    }
    
    const cards = await Card.find(
      { membername: { $regex: q, $options: 'i' } },
      { memberid: 1, membername: 1 }
    ).limit(10).sort({ membername: 1 });
    
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a new card
app.post('/cards', async (req, res) => {
  const { memberid, membername } = req.body;
  try {
    const existing = await Card.findOne({ memberid });
    if (existing) {
      return res.status(400).json({ error: 'Member ID already exists' });
    }
    const card = new Card({ memberid, membername });
    await card.save();
    res.status(201).json({ message: 'Card added successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a card
app.put('/cards/:id', async (req, res) => {
  const { memberid, membername } = req.body;
  try {
    const update = { memberid, membername };
    const card = await Card.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json({ message: 'Card updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a card
app.delete('/cards/:id', async (req, res) => {
  try {
    const card = await Card.findByIdAndDelete(req.params.id);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json({ message: 'Card deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Loan schema and model
const loanSchema = new mongoose.Schema({
  loanno: { type: String, required: true, unique: true },
  memberid: { type: String, required: true },
  membername: { type: String, required: true },
  loanamount: { type: Number, required: true },
  loandate: { type: Date, required: true },
  edi: { type: Number, required: true },
  noi: { type: Number, required: true },
  paidamount: { type: Number, required: true },
  interestincome: { type: Number, required: true },
  status: { type: Boolean, default: true },
});
const Loan = mongoose.model('Loan', loanSchema);

// Get all loans
app.get('/loans', authenticateToken, async (req, res) => {
  try {
    const loans = await Loan.find({}).sort({ loanno: 1 });
    res.json(loans);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a new loan
app.post('/loans', async (req, res) => {
  const { memberid, membername, loanamount, loandate, edi, noi, paidamount, interestincome } = req.body;
  try {
    // Auto-generate loan number
    const lastLoan = await Loan.findOne({}, {}, { sort: { loanno: -1 } });
    let nextLoanNo = 1;
    if (lastLoan && lastLoan.loanno) {
      const lastNumber = parseInt(lastLoan.loanno.replace(/\D/g, '')) || 0;
      nextLoanNo = lastNumber + 1;
    }
    const loanno = `LN${nextLoanNo.toString().padStart(4, '0')}`;
    
    const loan = new Loan({
      loanno,
      memberid,
      membername,
      loanamount,
      loandate,
      edi,
      noi,
      paidamount,
      interestincome,
      status: true
    });
    await loan.save();
    res.status(201).json({ message: 'Loan added successfully', loanno });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a loan
app.put('/loans/:id', async (req, res) => {
  const { loanno, memberid, membername, loanamount, loandate, edi, noi, paidamount, interestincome, status } = req.body;
  try {
    console.log('Updating loan with ID:', req.params.id);
    console.log('Update data received:', req.body);
    console.log('New loan date:', loandate, 'Type:', typeof loandate);
    
    // Ensure the loan date is properly formatted
    let formattedLoanDate = loandate;
    if (loandate && typeof loandate === 'string') {
      // If it's a date string, ensure it's valid
      const parsedDate = new Date(loandate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'Invalid loan date format' });
      }
      formattedLoanDate = parsedDate;
      console.log('Formatted loan date:', formattedLoanDate);
    }
    
    const update = { 
      loanno, 
      memberid, 
      membername, 
      loanamount, 
      loandate: formattedLoanDate, 
      edi, 
      noi, 
      paidamount, 
      interestincome,
      status // Include status field in update
    };
    console.log('Update object:', update);
    
    const loan = await Loan.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    
    console.log('Loan updated successfully:', loan);
    res.json({ message: 'Loan updated successfully', loan });
  } catch (err) {
    console.error('Error updating loan:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Delete a loan
app.delete('/loans/:id', async (req, res) => {
  try {
    const loan = await Loan.findByIdAndDelete(req.params.id);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    res.json({ message: 'Loan deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Transaction schema and model
const transactionSchema = new mongoose.Schema({
  loanno: { type: String, required: true },
  installmentdate: { type: Date, required: true },
  amount: { type: Number, required: true },
  paiddate: { type: Date, default: null }
});
const Transaction = mongoose.model('Transaction', transactionSchema);

// Create multiple transactions for a loan
app.post('/transactions/create', async (req, res) => {
  const { loanno, noi, loandate, edi } = req.body;
  try {
    console.log('Creating transactions for loan:', loanno);
    console.log('Transaction creation data:', req.body);
    console.log('Loan date received:', loandate, 'Type:', typeof loandate);
    
    // Validate and parse the loan date
    if (!loandate) {
      return res.status(400).json({ error: 'Loan date is required' });
    }
    
    const loanDate = new Date(loandate);
    if (isNaN(loanDate.getTime())) {
      return res.status(400).json({ error: 'Invalid loan date format' });
    }
    
    console.log('Parsed loan date:', loanDate);
    console.log('Loan date ISO string:', loanDate.toISOString());
    
    // First, clear any existing transactions for this loan to ensure clean slate
    console.log('Clearing existing transactions for loan:', loanno);
    const deleteResult = await Transaction.deleteMany({ loanno });
    console.log(`Deleted ${deleteResult.deletedCount} existing transactions`);
    
    const transactions = [];

    // Create transactions for each installment - daily installments
    for (let i = 0; i < noi; i++) {
      const installmentDate = new Date(loanDate);
      installmentDate.setDate(loanDate.getDate() + i); // Daily installments (i days from loan date)
      
      console.log(`Creating installment ${i + 1}: Date: ${installmentDate.toISOString()}, Amount: ${edi}`);
      
      transactions.push({
        loanno,
        installmentdate: installmentDate,
        amount: edi,
        paiddate: null
      });
    }

    console.log(`Inserting ${transactions.length} transactions into database`);
    await Transaction.insertMany(transactions);
    
    console.log('Transactions created successfully');
    res.status(201).json({ message: `Created ${noi} transaction records for loan ${loanno}` });
  } catch (err) {
    console.error('Error creating transactions:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Delete transactions by loan number
app.delete('/transactions/deleteByLoan', async (req, res) => {
  const { loanno } = req.body;
  try {
    if (!loanno) {
      return res.status(400).json({ error: 'Loan number is required' });
    }
    
    const result = await Transaction.deleteMany({ loanno });
    res.json({ 
      message: `Deleted ${result.deletedCount} transaction records for loan ${loanno}`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error('Error deleting transactions:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Get all transactions
app.get('/transactions', async (req, res) => {
  try {
    const { loanno } = req.query;
    if (loanno) {
      // Filter by specific loan number
      const transactions = await Transaction.find({ loanno }).sort({ installmentdate: 1 });
      res.json(transactions);
    } else {
      // Get all transactions
      const transactions = await Transaction.find({}).sort({ loanno: 1, installmentdate: 1 });
      res.json(transactions);
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a transaction (for payment processing)
app.put('/transactions/:id', async (req, res) => {
  try {
    const { loanno, installmentdate, amount, paiddate } = req.body;
    
    const update = {};
    if (loanno !== undefined) update.loanno = loanno;
    if (installmentdate !== undefined) update.installmentdate = installmentdate;
    if (amount !== undefined) update.amount = amount;
    if (paiddate !== undefined) update.paiddate = paiddate;
    
    const transaction = await Transaction.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json({ message: 'Transaction updated successfully', transaction });
  } catch (err) {
    console.error('Error updating transaction:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Dashboard summary endpoint
app.get('/dashboard/summary', authenticateToken, async (req, res) => {
  try {
    const [loanAgg, cardCount, activeLoansCount, closedLoansCount] = await Promise.all([
      Loan.aggregate([
        {
          $group: {
            _id: null,
            totalPaidAmount: { $sum: "$paidamount" },
            totalInterestIncome: { $sum: "$interestincome" },
          },
        },
      ]),
      Card.countDocuments(),
      Loan.countDocuments({ status: true }), // Active loans
      Loan.countDocuments({ status: false }), // Closed loans
    ]);
    const summary = {
      totalPaidAmount: loanAgg[0]?.totalPaidAmount || 0,
      totalInterestIncome: loanAgg[0]?.totalInterestIncome || 0,
      totalCards: cardCount,
      activeLoans: activeLoansCount,
      closedLoans: closedLoansCount,
    };
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a /verify endpoint for token validation
app.get('/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`MongoDB URI: ${MONGODB_URI}`);
});
