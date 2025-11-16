# Financial Management System (FinMan)

A comprehensive financial management application built with React frontend and Express.js backend, featuring user management, loan tracking, installment management, and reporting capabilities.

## Project Structure

```
my-project/
├─ backend/ # Express + MongoDB API
│ ├─ src/
│ ├─ package.json
│ ├─ .env.example
├─ frontend/ # React / Angular app
│ ├─ src/
│ ├─ package.json
│ ├─ .env.example
├─ db-backup/ # Database dump or seed data
├─ README.md # Setup instructions
└─ .gitignore
```

## Features

- **User Management**: Secure user registration and authentication with JWT
- **Card Management**: Member ID and name management
- **Loan Management**: Complete loan lifecycle management
- **Installment Tracking**: Daily installment management and payment tracking
- **Dashboard**: Real-time financial summaries and analytics
- **Reports**: Comprehensive reporting with PDF export capabilities

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## Installation & Setup

### 1. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
MONGODB_URI=mongodb://localhost:27017/mydb
JWT_SECRET=your_strong_jwt_secret_key_here
PORT=5000
NODE_ENV=development
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in the frontend directory:

```bash
cp .env.example .env
```

Edit the `.env` file:

```env
REACT_APP_API_URL=http://localhost:5000
NODE_ENV=development
```

### 3. Database Setup

#### Option A: Using MongoDB Backup (Recommended)

If you have a database backup in the `db-backup/` folder:

```bash
# Restore the database
mongorestore --db mydb ./db-backup/mydb
```

#### Option B: Fresh Database Setup

If starting with a fresh database, the application will create the necessary collections automatically when you start using the features.

Make sure MongoDB is running:

```bash
# Start MongoDB service (Windows)
net start MongoDB

# Or start MongoDB daemon (Linux/Mac)
mongod
```

## Running the Application

### 1. Start the Backend Server

```bash
cd backend
npm run dev
```

The backend server will start on `http://localhost:5000`

### 2. Start the Frontend Application

In a new terminal:

```bash
cd frontend
npm run dev
```

The frontend application will start on `http://localhost:3000`

## How to Create Database Backup

To create a backup of your database for submission:

```bash
mongodump --db mydb --out ./db-backup
```

This creates the necessary backup files in the `db-backup/mydb/` folder.

## API Endpoints

### Authentication
- `POST /signup` - User registration
- `POST /login` - User login
- `GET /verify` - Token verification

### Users
- `GET /users` - Get all users
- `POST /users` - Add new user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Cards/Members
- `GET /cards` - Get all members
- `GET /cards/search?q=query` - Search members
- `POST /cards` - Add new member
- `PUT /cards/:id` - Update member
- `DELETE /cards/:id` - Delete member

### Loans
- `GET /loans` - Get all loans
- `POST /loans` - Add new loan
- `PUT /loans/:id` - Update loan
- `DELETE /loans/:id` - Delete loan

### Transactions/Installments
- `GET /transactions` - Get all transactions
- `GET /transactions?loanno=LN0001` - Get transactions for specific loan
- `POST /transactions/create` - Create installment schedule
- `PUT /transactions/:id` - Update transaction
- `DELETE /transactions/deleteByLoan` - Delete transactions by loan

### Dashboard
- `GET /dashboard/summary` - Get dashboard summary

## Database Schema

### Users Collection
```javascript
{
  username: String (unique),
  password: String (hashed),
  plainPassword: String
}
```

### Cards Collection
```javascript
{
  memberid: String (unique),
  membername: String
}
```

### Loans Collection
```javascript
{
  loanno: String (unique),
  memberid: String,
  membername: String,
  loanamount: Number,
  loandate: Date,
  edi: Number, // Equated Daily Installment
  noi: Number, // Number of Installments
  paidamount: Number,
  interestincome: Number,
  status: Boolean
}
```

### Transactions Collection
```javascript
{
  loanno: String,
  installmentdate: Date,
  amount: Number,
  paiddate: Date (nullable)
}
```

## Default Login Credentials

The application creates a default admin user on first run:
- Username: `admin`
- Password: `admin123`

**Note**: Change these credentials immediately after first login for security.

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check the connection string in `.env`
   - Verify MongoDB is accessible on the specified port

2. **Port Already in Use**
   - Change the PORT in backend `.env` file
   - Update REACT_APP_API_URL in frontend `.env` file accordingly

3. **CORS Issues**
   - Ensure backend is running on the correct port
   - Check REACT_APP_API_URL matches backend URL

4. **JWT Token Issues**
   - Clear browser localStorage
   - Restart both frontend and backend servers

### Database Backup

To create a backup of your database:

```bash
mongodump --db mydb --out ./db-backup
```

To restore from backup:

```bash
mongorestore --db mydb ./db-backup/mydb
```

## Development

### Adding New Features

1. Backend API endpoints should be added to `backend/server.js`
2. Frontend components should be added to `frontend/src/`
3. Update this README with new API endpoints

### Code Structure

- **Backend**: Express.js with MongoDB/Mongoose
- **Frontend**: React with functional components and hooks
- **Authentication**: JWT-based authentication
- **Styling**: CSS modules and inline styles

## Production Deployment

1. Set `NODE_ENV=production` in both `.env` files
2. Use a strong JWT secret
3. Use MongoDB Atlas or a production MongoDB instance
4. Build the frontend: `npm run build`
5. Serve the built files with a web server

## License

MIT License

## Support

For issues and questions, please contact the development team.