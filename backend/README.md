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

The server will run on `http://localhost:4000` in development and on the Render service URL in production.

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

### Messages
- `GET /api/messages` - Get all chat messages
- `POST /api/messages` - Create or upsert a chat message
- `PUT /api/messages/:id` - Update a chat message, including read state
- `DELETE /api/messages/:id` - Delete a chat message manually

### Activity
- `GET /api/activity` - Get activity logs
- `POST /api/activity` - Log an activity

## Data Storage

The backend uses JSON files for data storage:
- `data/users.json` - User accounts
- `data/products.json` - Product listings
- `data/orders.json` - Order records
- `data/messages.json` - Chat history
- `data/activityLogs.json` - Activity logs

## Dependencies

- Express.js
- CORS
- @getbrevo/brevo
- UUID
- Body Parser

## Email Setup (Brevo)

To send real password reset and OTP emails, configure Brevo transactional email API variables before starting the backend:

- `BREVO_API_KEY` - your Brevo API key
- `FROM_EMAIL` - sender address shown in reset emails and OTP emails
- `FROM_NAME` - optional sender display name
- `DEBUG_PASSWORD_RESET` - set to `true` in development only if you want the API to return a debug reset link

When a user submits the forgot-password form, the backend stores a one-hour reset token and sends a reset link via the Brevo API. OTP emails are sent from the `/api/auth/send-otp` and `/api/auth/resend-otp` endpoints.
