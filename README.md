# FinMan (Financial Management System)

FinMan is a full-stack financial management system for handling member cards, loans, daily installments, and reporting. The project includes a React single-page app and an Express + MongoDB API.

## Highlights

- Authentication with JWT (signup/login and token verification)
- Member card management with search and exports
- Loan lifecycle management (active/closed) with daily installment schedules
- Installment payments with auto-close on full repayment
- Dashboard charts (paid vs outstanding, top members)
- Reports with Excel/PDF export

## Tech Stack

- Frontend: React (react-router, recharts, jspdf, xlsx)
- Backend: Express, Mongoose, JWT, bcrypt
- Database: MongoDB

## Project Structure

```
finman/
├─ backend/
│  ├─ src/
│  │  └─ server.js
│  ├─ package.json
│  └─ .env.example
├─ frontend/
│  ├─ public/
│  ├─ src/
│  ├─ package.json
│  └─ .env.example
├─ db-backup/
│  └─ finman/   # MongoDB dump
└─ README.md
```

## Prerequisites

- Node.js 18+ recommended
- MongoDB 4.4+
- npm

## Setup

### 1) Backend

```bash
cd backend
npm install
```

Create backend `.env` (recommended values shown below). The current `.env.example` is a placeholder and does not include the backend keys.

```env
MONGODB_URI=mongodb://localhost:27017/finman
JWT_SECRET=replace_with_a_strong_secret
PORT=5000
NODE_ENV=development
```

Start the API server:

```bash
node src/server.js
```

Note: `backend/package.json` currently points to `server.js` at the repo root. Either use the command above or update the script to `node src/server.js`.

### 2) Frontend

```bash
cd frontend
npm install
```

Create frontend `.env`:

```env
REACT_APP_API_URL=http://localhost:5000
NODE_ENV=development
```

Start the React app:

```bash
npm start
```

The app runs on `http://localhost:3000` and expects the API at `http://localhost:5000`.

Important: several components currently use a hard-coded API URL (`http://localhost:5000`). If you change the backend URL, update those constants or refactor to use `REACT_APP_API_URL`.

## Database Restore (Optional)

If you want sample data, restore the MongoDB dump:

```bash
mongorestore --db finman ./db-backup/finman
```

To create a new dump later:

```bash
mongodump --db finman --out ./db-backup
```

## Key Workflows

- Sign up a user, then log in to receive a JWT token.
- Create member cards (Member ID, Member Name).
- Create loans for members; loan numbers are auto-generated (LN0001, LN0002, ...).
- Generate installment schedules (daily installments) per loan.
- Credit installments and auto-close loans when all installments are paid.
- Export users/cards/loans to Excel or PDF.

## API Reference

Base URL: `http://localhost:5000`

### Auth

- `POST /signup`
- `POST /login`
- `GET /verify` (requires `Authorization: Bearer <token>`)

### Users

- `GET /users`
- `POST /users`
- `PUT /users/:id`
- `DELETE /users/:id`

### Cards

- `GET /cards`
- `GET /cards/search?q=term`
- `POST /cards`
- `PUT /cards/:id`
- `DELETE /cards/:id`

### Loans

- `GET /loans` (requires `Authorization: Bearer <token>`)
- `POST /loans`
- `PUT /loans/:id`
- `DELETE /loans/:id`

### Transactions

- `GET /transactions` (supports `?loanno=LN0001`)
- `POST /transactions/create`
- `PUT /transactions/:id`
- `DELETE /transactions/deleteByLoan`

### Dashboard

- `GET /dashboard/summary` (requires `Authorization: Bearer <token>`)

### Health

- `GET /health`

## Data Model (MongoDB)

### Users

```js
{
  username: String, // unique
  password: String, // bcrypt hash
  plainPassword: String // stored for demo only
}
```

### Cards

```js
{
  memberid: String, // unique
  membername: String
}
```

### Loans

```js
{
  loanno: String, // unique, auto-generated
  memberid: String,
  membername: String,
  loanamount: Number,
  loandate: Date,
  edi: Number, // equated daily installment
  noi: Number, // number of installments
  paidamount: Number,
  interestincome: Number,
  status: Boolean // true=active, false=closed
}
```

### Transactions

```js
{
  loanno: String,
  installmentdate: Date,
  amount: Number,
  paiddate: Date | null
}
```

## Security Notes

- The backend stores `plainPassword` for demo visibility in the UI. Remove this field for production use.
- Ensure `JWT_SECRET` is a strong, private value in any non-local environment.

## Troubleshooting

- MongoDB connection errors: confirm `MONGODB_URI` and ensure the service is running.
- JWT issues: clear `localStorage` in the browser and log in again.
- API URL mismatch: update hard-coded `http://localhost:5000` constants in the frontend.

## License

MIT
