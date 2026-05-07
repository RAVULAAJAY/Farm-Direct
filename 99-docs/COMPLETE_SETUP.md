# Farm Direct - Complete Setup Guide

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Project Structure](#project-structure)
5. [Running the Application](#running-the-application)
6. [Environment Configuration](#environment-configuration)
7. [Troubleshooting]

## Project Overview

**Farm Direct** is a comprehensive farmer-to-buyer marketplace platform built with modern web technologies:

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS
- **Backend**: Express.js, Node.js, JSON-based storage
- **Architecture**: Separated frontend and backend for scalability

### Key Features
- ✅ Farmer Product Management
- ✅ Buyer Marketplace & Shopping
- ✅ Admin Dashboard & Moderation
- ✅ Real-time Chat System
- ✅ Ratings & Reviews
- ✅ Location-Based Discovery
- ✅ Order Management
- ✅ Payment Processing
- ✅ Delivery Tracking
- ✅ Notifications System

## Prerequisites

Before getting started, ensure you have:
- **Node.js** v14 or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** (for version control)
- **Terminal/Command Prompt** access

### Verify Installation
```bash
node --version
npm --version
```

## Quick Start

### Step 1: Clone/Navigate to Project
```bash
cd Farm-Direct
```

### Step 2: Install Backend Dependencies
```bash
cd backend
npm install
cd ..
```

### Step 3: Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### Step 4: Run Backend (Terminal 1)
```bash
cd backend
npm start
```
Backend will run on: **`http://localhost:4000`**

### Step 5: Run Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```
Frontend will run on: **`http://localhost:8080`**

### ✅ You're Ready!
Open your browser and visit: **`http://localhost:8080`**

## Project Structure

```
Farm-Direct/
│
├── backend/                    # Express API Server
│   ├── server.cjs             # Main server entry point
│   ├── server.js              # Alternative entry point
│   ├── package.json           # Dependencies
│   ├── .env.example           # Environment template
│   ├── SETUP.md               # Backend setup guide
│   │
│   └── data/                  # JSON Database
│       ├── users.json
│       ├── products.json
│       ├── orders.json
│       └── activityLogs.json
│
├── frontend/                   # React Application
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── AuthForm.tsx
│   │   │   ├── Buyer/
│   │   │   ├── Farmer/
│   │   │   ├── Chat/
│   │   │   ├── Payment/
│   │   │   └── ... (more components)
│   │   ├── pages/            # Page components
│   │   ├── context/          # React Context
│   │   ├── hooks/            # Custom hooks
│   │   ├── lib/              # Utilities
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   ├── public/               # Static assets
│   ├── index.html            # HTML entry point
│   ├── package.json          # Dependencies
│   ├── vite.config.ts        # Vite config
│   ├── tailwind.config.ts    # Tailwind config
│   ├── tsconfig.json         # TypeScript config
│   ├── eslint.config.js      # ESLint config
│   ├── .env.example          # Environment template
│   ├── SETUP.md              # Frontend setup guide
│   └── README.md
│
└── README.md                 # This file
```

## Running the Application

### Backend Only
```bash
cd backend
npm install
npm start
```
API runs on `http://localhost:4000`

### Frontend Only
```bash
cd frontend
npm install
npm run dev
```
App runs on `http://localhost:8080`

### Both Together (Recommended)

**Terminal 1:**
```bash
cd backend
npm install
npm start
```

**Terminal 2:**
```bash
cd frontend
npm install
npm run dev
```

### Build for Production

**Backend**: Already production-ready (runs `server.cjs`)

**Frontend**:
```bash
cd frontend
npm run build
# Output in frontend/dist/
```

## Environment Configuration

### Backend (.env)
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:8080
```

### Frontend (.env)
```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:4000
VITE_APP_NAME=Farm Direct
```

## API Endpoints

### Users
- `GET /api/users` - List all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `POST /api/products/:id/reviews` - Add review

### Orders
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order

### Activity
- `GET /api/activity` - Activity logs
- `POST /api/activity` - Log activity

## Troubleshooting

### Backend won't start
```bash
# Check if port 4000 is in use
netstat -ano | findstr :4000

# Try different port
PORT=5000 npm start
```

### Frontend won't start
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### API Connection Error
1. Ensure backend is running (`http://localhost:4000`)
2. Check `.env` file in frontend
3. Check browser console for CORS errors

### Data not persisting
- Backend stores JSON in `backend/data/`
- Ensure write permissions on data folder
- Check JSON file formatting

### Module not found
```bash
# Clear node_modules and reinstall
npm clean-cache
rm -rf node_modules
npm install
```

## Development Workflow

1. **Backend changes**: Restart backend server
2. **Frontend changes**: Auto-reload with HMR (Hot Module Replacement)
3. **Data changes**: Check `backend/data/` JSON files
4. **Environment changes**: Restart respective server

## Additional Resources

- **Backend Setup**: See `backend/SETUP.md`
- **Frontend Setup**: See `frontend/SETUP.md`
- **Backend README**: `backend/README.md`
- **Frontend README**: `frontend/README.md`

## Technologies Used

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Shadcn UI
- React Router
- React Hook Form
- TanStack React Query

### Backend
- Express.js
- Node.js
- CORS
- UUID
- JSON File Storage

## Notes

- **Old Folder**: The old `harvest-connect-mobile-main/` folder is no longer needed and can be deleted
- **Production**: For production, configure proper database (replace JSON storage)
- **CORS**: Currently allows all origins - restrict in production
- **Authentication**: Implement proper JWT/session-based auth for production

## Support

For detailed information:
- Backend issues: See `backend/SETUP.md`
- Frontend issues: See `frontend/SETUP.md`
- API documentation: Access `http://localhost:4000` when running

---

**Last Updated**: May 7, 2026
**Version**: 1.0.0
