# Farm Direct Frontend Setup Guide

## Prerequisites
- Node.js (v16 or higher)
- npm or yarn

## Installation

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file (optional, uses defaults if not provided):
   ```bash
   cp .env.example .env
   ```

## Running the Application

### Development Mode
```bash
npm run dev
```

The app will start on `http://localhost:8080` with hot module replacement enabled.

### Production Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Linting
```bash
npm run lint
```

## Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable React components
│   │   ├── AdminDashboard.tsx
│   │   ├── AuthForm.tsx
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Buyer/          # Buyer-specific components
│   │   ├── Farmer/         # Farmer-specific components
│   │   ├── Chat/           # Chat components
│   │   ├── Payment/        # Payment components
│   │   ├── Ratings/        # Review components
│   │   ├── Location/       # Location components
│   │   ├── Delivery/       # Delivery components
│   │   ├── Notifications/
│   │   └── ui/             # Shadcn UI components
│   ├── pages/              # Page components
│   ├── context/            # React Context (auth, global state)
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions
│   ├── App.tsx             # Main app component
│   ├── main.tsx            # Entry point
│   ├── index.css           # Global styles
│   └── App.css
├── public/                 # Static assets
├── index.html              # HTML entry point
├── package.json            # Dependencies
├── vite.config.ts          # Vite configuration
├── tailwind.config.ts      # Tailwind CSS config
├── tsconfig.json           # TypeScript config
├── postcss.config.js       # PostCSS config
├── eslint.config.js        # ESLint config
├── components.json         # Shadcn UI config
├── .env.example            # Environment variables template
├── .gitignore
└── README.md
```

## Key Features

- **Role-Based Authentication**: Farmer, Buyer, Admin roles
- **Farmer Dashboard**: Manage products, view orders, track payments
- **Buyer Marketplace**: Browse products, add to cart, checkout
- **Admin Dashboard**: Moderation, user management, activity logs
- **Real-Time Chat**: Farmer-buyer communication
- **Ratings & Reviews**: Product reviews with ratings
- **Location-Based Search**: Filter farmers/products by distance
- **Delivery Tracking**: Real-time delivery status
- **Notifications**: Real-time user notifications
- **PDF Export**: Order and invoice export
- **Payment Integration**: Payment flow and tracking

## Technology Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Styling
- **Shadcn UI** - Component library
- **React Router** - Routing
- **React Hook Form** - Form handling
- **TanStack React Query** - Data fetching
- **Recharts** - Data visualization
- **jsPDF** - PDF export
- **Lucide React** - Icons

## Environment Variables

Update `.env` based on `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:4000
VITE_APP_NAME=Farm Direct
```

## API Integration

The frontend communicates with the backend API at `http://localhost:4000`. The backend must be running for the app to function properly.

Backend API URL: `http://localhost:4000`

## Development Workflow

1. **Hot Module Replacement**: Changes auto-reload in browser
2. **Type Checking**: TypeScript ensures type safety
3. **Linting**: ESLint enforces code quality
4. **Build Optimization**: Vite provides fast builds

## Building for Production

```bash
npm run build
```

This creates an optimized build in the `dist/` directory ready for deployment.

## Troubleshooting

### Port 8080 already in use
Vite will automatically use the next available port, or you can specify:
```bash
npm run dev -- --port 3000
```

### API connection issues
- Ensure backend is running on `http://localhost:4000`
- Check `.env` file has correct `VITE_API_BASE_URL`
- Check browser console for CORS errors

### Module not found errors
Run `npm install` to ensure all dependencies are installed.

### Build issues
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf dist && npm run build`

## Performance Tips

- Use React DevTools to identify re-renders
- Implement code splitting with React.lazy()
- Optimize images and assets
- Use TanStack Query for efficient data fetching
