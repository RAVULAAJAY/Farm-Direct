# Farm Direct - Quick Reference

## 🚀 Quick Start Commands

### First Time Setup
```bash
# Terminal 1: Backend
cd backend
npm install
npm start

# Terminal 2: Frontend (new terminal)
cd frontend
npm install
npm run dev
```

## 📂 Directory Navigation

```bash
# Backend
cd Farm-Direct/backend

# Frontend
cd Farm-Direct/frontend

# Root
cd Farm-Direct
```

## 🔧 Common Commands

### Backend (from `backend/` directory)
```bash
npm install          # Install dependencies
npm start            # Start server (http://localhost:4000)
npm run dev          # Same as npm start
```

### Frontend (from `frontend/` directory)
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:8080)
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## 🔌 Ports

| Service | Port | URL |
|---------|------|-----|
| Backend API | 4000 | http://localhost:4000 |
| Frontend App | 8080 | http://localhost:8080 |

## 📁 File Locations

| File | Location |
|------|----------|
| Backend Server | `backend/server.cjs` |
| Frontend Entry | `frontend/src/main.tsx` |
| Data Storage | `backend/data/` |
| React Components | `frontend/src/components/` |
| Environment Template | `.env.example` (in each folder) |

## 🔄 Workflow

1. **Make Changes**
   - Backend: Edit `.cjs` files → Restart server
   - Frontend: Edit `.tsx` files → Auto-reloads

2. **Test Changes**
   - Open `http://localhost:8080`
   - Check browser console for errors

3. **Check Logs**
   - Backend: Check terminal where `npm start` runs
   - Frontend: Check browser console (F12)

## 🐛 Troubleshooting

### Port In Use
```bash
# Find process on port
netstat -ano | findstr :4000  # Windows
lsof -i :4000                 # Mac/Linux

# Use different port
PORT=5000 npm start
```

### Module Not Found
```bash
npm install
# or
rm -rf node_modules && npm install
```

### Clear Cache
```bash
npm cache clean --force
npm install
```

### Check Status
```bash
# Backend running?
curl http://localhost:4000

# Frontend running?
Open http://localhost:8080 in browser
```

## 📦 API Endpoints

### Test API
```bash
# Get all users
curl http://localhost:4000/api/users

# Get all products
curl http://localhost:4000/api/products

# Get activity logs
curl http://localhost:4000/api/activity
```

## 📝 Common Tasks

### Create New Backend Route
1. Edit `backend/server.cjs`
2. Add new `app.get()` or `app.post()` route
3. Restart backend

### Create New React Component
1. Create file in `frontend/src/components/`
2. Import in needed page/component
3. Changes auto-refresh

### Add Dependencies

**Backend**:
```bash
cd backend
npm install package-name
```

**Frontend**:
```bash
cd frontend
npm install package-name
```

## 🗑️ Cleanup

### Remove Old Folder
```bash
# Safe to delete (all content migrated)
rm -rf harvest-connect-mobile-main
```

### Clear Temporary Files
```bash
# Backend
cd backend && rm -rf dist

# Frontend
cd frontend && rm -rf dist
```

## 📚 Documentation Files

- `COMPLETE_SETUP.md` - Full setup guide
- `backend/SETUP.md` - Backend details
- `frontend/SETUP.md` - Frontend details
- `backend/README.md` - Backend API docs
- `frontend/README.md` - Frontend info

## 🔐 Environment Files

### Create .env Files
```bash
# Backend
cd backend
cp .env.example .env

# Frontend
cd frontend
cp .env.example .env
```

### Edit .env Files
```bash
# Backend: backend/.env
PORT=4000
NODE_ENV=development

# Frontend: frontend/.env
VITE_API_BASE_URL=http://localhost:4000
```

## 💾 Data Location

All data stored in: `backend/data/`
- `users.json` - User accounts
- `products.json` - Products
- `orders.json` - Orders
- `activityLogs.json` - Activity logs

## 🆘 Need Help?

1. Check relevant `SETUP.md` file
2. Review browser console (F12)
3. Check backend terminal output
4. Verify ports are correct
5. Ensure both services are running

---

**Quick Links**:
- Backend: http://localhost:4000
- Frontend: http://localhost:8080
- Documentation: `COMPLETE_SETUP.md`
