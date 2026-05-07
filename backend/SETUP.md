# Farm Direct Backend Setup Guide

## Prerequisites
- Node.js (v14 or higher)
- npm or yarn

## Installation

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file (optional, uses defaults if not provided):
   ```bash
   cp .env.example .env
   ```

## Running the Server

### Development Mode
```bash
npm start
# or
npm run dev
```

The server will start on `http://localhost:4000`

### Production Mode
```bash
NODE_ENV=production npm start
```

## Project Structure

```
backend/
├── server.cjs              # Main Express server (CommonJS)
├── server.js               # Alternative server entry point
├── package.json            # Dependencies and scripts
├── .env.example            # Environment variables template
├── .gitignore
├── data/                   # JSON data storage
│   ├── users.json
│   ├── products.json
│   ├── orders.json
│   └── activityLogs.json
└── README.md
```

## API Endpoints

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `POST /api/products/:id/reviews` - Add product review

### Orders
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create order

### Activity Logs
- `GET /api/activity` - Get activity logs
- `POST /api/activity` - Create activity log

## Data Storage

All data is stored in JSON files in the `data/` directory:
- `users.json` - User accounts and profiles
- `products.json` - Product listings
- `orders.json` - Customer orders
- `activityLogs.json` - System activity logs

## Dependencies

- **express** - Web framework
- **cors** - Cross-origin resource sharing
- **uuid** - Unique ID generation
- **body-parser** - Request body parsing

## Troubleshooting

### Port already in use
If port 4000 is already in use, modify the port in `server.cjs` or set the PORT environment variable:
```bash
PORT=5000 npm start
```

### CORS Issues
Make sure the frontend URL is correctly set in the CORS configuration. By default:
- Frontend: `http://localhost:8080`
- Backend: `http://localhost:4000`

### Data file errors
The server automatically creates the `data/` directory and initializes JSON files with an admin user if they don't exist.

## Development Notes

- Changes to `server.cjs` require server restart
- Data persists in JSON files
- CORS is enabled for all origins by default (configure in production)
