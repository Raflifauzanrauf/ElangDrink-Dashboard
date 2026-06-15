# ElangDrink Dashboard

Admin dashboard for ElangDrink with RBAC, proposal approval workflow, and multi-currency management.

## Tech Stack

- **Frontend**: Next.js 15 (React 19) + Tailwind CSS v3 + shadcn/ui
- **Backend**: Express.js 4 + TypeScript + SQLite (sql.js)
- **Auth**: JWT + Google OAuth
- **UI**: Dark theme (#121212), Poppins font, recharts

## Features

- Role-Based Access Control (admin, manager, editor, viewer + custom roles)
- Proposal management with type-based approval workflow
  - **Financial** (Pengajuan Keuangan): approval up to SPV
  - **Heavy** (Pengajuan Berat): approval up to Super Admin
- Multi-currency management with exchange rates
- User & role management with granular permissions
- Audit logging with search, filter, and CSV export
- Notification system for proposal events
- Dashboard with summary stats and charts
- Google OAuth login

## Prerequisites

- Node.js 18+
- npm 9+

## Installation

```bash
# Clone repo
git clone https://github.com/Raflifauzanrauf/ElangDrink-Dashboard.git
cd ElangDrink-Dashboard

# Install all dependencies (workspaces)
npm install

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

### Configuration

Edit `backend/.env`:
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
CALLBACK_URL=http://localhost:3000/auth/google/callback
```

Edit `frontend/.env.local`:
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

> Google OAuth is optional. Login via email/password works without it.

## Running

```bash
# Start both frontend and backend concurrently
npm run dev

# Or separately:
npm run dev:backend   # Express on :4000
npm run dev:frontend  # Next.js on :3000
```

### Default Admin Login

- Email: `admin@admin.com`
- Password: `admin123`

## Database

Data is stored in SQLite (`backend/data/elangdrink.db`) — persistent across restarts.  
To reset all data, delete the `.db` file and restart the server.

## Testing

```bash
npm run test -w backend
```

## Project Structure

```
├── backend/
│   └── src/
│       ├── index.ts              # Express entry point
│       ├── db.ts                 # SQLite database layer
│       ├── types.ts              # TypeScript interfaces
│       ├── middleware/
│       │   ├── auth.ts           # JWT, RBAC middleware, seed data
│       │   └── audit.ts          # Audit logging
│       ├── routes/               # API route handlers
│       └── utils/                # Helpers (pagination, CSV, format)
├── frontend/
│   ├── app/                      # Next.js App Router pages
│   ├── components/               # React components (Sidebar, ui/)
│   └── context/                  # AuthContext
└── package.json                  # Workspace root
```

## API Routes

| Method | Route                | Description            |
|--------|----------------------|------------------------|
| POST   | /api/auth/login      | Login                  |
| POST   | /api/auth/register   | Register               |
| POST   | /api/auth/google     | Google OAuth           |
| POST   | /api/auth/logout     | Logout                 |
| GET    | /api/auth/me         | Current user + perms   |
| CRUD   | /api/users           | User management        |
| CRUD   | /api/roles           | Role management        |
| GET    | /api/permissions     | List permissions       |
| CRUD   | /api/currencies      | Currency management    |
| CRUD   | /api/proposals       | Proposal workflow      |
| GET    | /api/audit-logs      | Audit trail            |
| GET    | /api/dashboard       | Dashboard stats        |
| CRUD   | /api/notifications   | Notifications          |
