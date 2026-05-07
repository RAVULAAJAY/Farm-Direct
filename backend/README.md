# Farm Direct Backend

Express.js API server for Farm Direct application.

## Installation

```bash
npm install
```

## Running the Server

```bash
npm start
```

The server will run on `http://localhost:4000`

## API Endpoints

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create a new user
- `PUT /api/users/:id` - Update a user

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create a product
- `PUT /api/products/:id` - Update a product
- `DELETE /api/products/:id` - Delete a product
- `POST /api/products/:id/reviews` - Add a review to a product

### Orders
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create an order

### Activity
- `GET /api/activity` - Get activity logs
- `POST /api/activity` - Log an activity

## Data Storage

The backend uses JSON files for data storage:
- `data/users.json` - User accounts
- `data/products.json` - Product listings
- `data/orders.json` - Order records
- `data/activityLogs.json` - Activity logs

## Dependencies

- Express.js
- CORS
- UUID
- Body Parser
