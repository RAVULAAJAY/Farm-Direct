# 🌾 Farm Direct - Marketplace Platform

A comprehensive **farmer-to-buyer marketplace** built with modern technologies: React, Vite, TypeScript, Tailwind CSS, Express.js, and Shadcn/UI.

## 📋 Quick Navigation

- **Quick Start**: See [QUICK_START.md](QUICK_START.md)
- **Full Setup**: See [COMPLETE_SETUP.md](COMPLETE_SETUP.md)
- **Backend Docs**: See [backend/README.md](backend/README.md)
- **Frontend Docs**: See [frontend/README.md](frontend/README.md)

## 🚀 Quick Start (2 min setup)

### Terminal 1: Start Backend
```bash
cd backend
npm install
npm start
# http://localhost:4000
```

### Terminal 2: Start Frontend
```bash
cd frontend
npm install
npm run dev
# http://localhost:8080
```

**Visit**: http://localhost:8080

## 📁 Project Structure

```
Farm-Direct/
├── backend/              Express.js API Server
│   ├── server.cjs       Main server (CommonJS)
│   ├── package.json     Backend dependencies
│   ├── data/            JSON database
│   ├── SETUP.md         Backend guide
│   └── README.md        API documentation
│
├── frontend/             React + Vite Application
│   ├── src/             React source code
│   ├── package.json     Frontend dependencies
│   ├── SETUP.md         Frontend guide
│   └── README.md        Frontend docs
│
├── QUICK_START.md       Quick reference guide
├── COMPLETE_SETUP.md    Comprehensive setup
└── README.md            This file
```

## Key Features

- farmer signup, login, profile completion, listings, and payments
- buyer signup, login, browsing, cart, checkout, favorites, and orders
- admin login-only access and moderation dashboard
- product details, ratings, reviews, chat, delivery, notifications, and settings
- local JSON-backed API for users, products, orders, and activity logs

## Stack

- TypeScript
- React
- Vite
- Tailwind CSS
- Express
- React Router
- React Query
- jsPDF
- Lucide React

## Notes

- The root README exists so GitHub shows project documentation at the repository level.
- The full application code and deeper documentation live in `harvest-connect-mobile-main/`.
