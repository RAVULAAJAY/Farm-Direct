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
- Nodemailer
- UUID
- Body Parser

## Password Reset Email Setup

To send real password reset emails, configure these environment variables before starting the backend:

- `FRONTEND_URL` - public frontend URL used in reset links, for example `https://your-app.vercel.app`
- `SMTP_HOST` - your SMTP server host
- `SMTP_PORT` - SMTP port, usually `587`
- `SMTP_LOGIN` - SMTP username/login
- `SMTP_KEY` - SMTP password or app password
- `FROM_EMAIL` - sender address shown in reset emails and OTP emails
- `DEBUG_PASSWORD_RESET` - set to `true` in development only if you want the API to return a debug reset link

When a user submits the forgot-password form, the backend stores a one-hour reset token, emails a reset link, and the reset page at `/reset-password` lets the user set a new password.

OTP emails use the same SMTP credentials and are sent from the `/api/auth/send-otp` and `/api/auth/resend-otp` endpoints.
