# Full-Stack Appointment Booking System - Setup & Execution Guide

This guide explains how to configure, set up, and run both the backend (Express/Sequelize/MySQL) and frontend (Next.js/Tailwind v4) layers of the Appointment Booking application.

---

## Prerequisites

Make sure you have the following installed on your machine:
- **Node.js** (v18 or higher recommended)
- **MySQL Server** (running locally on port `3306`)

---

## 📂 Project Structure

- `booking-system-server/`: Express API server, Sequelize ORM setup, validation layers, and concurrency locks.
- `booking-system-client/booking-system-client/`: Next.js client, page routing, and user interface.

---

## 1. Backend (Server) Setup

Navigate to the server directory:
```bash
cd booking-system-server
```

### Configure Environment Variables
Verify or edit the `.env` file at the root of the server folder:
```ini
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_NAME=appointment_booking
DB_USER=root
DB_PASSWORD=

JWT_SECRET=change_this_secret
JWT_EXPIRES_IN=1d
CANCEL_WINDOW_MINUTES=120
```

### Install Dependencies
```bash
npm install
```

### Run Migrations
Run the following command to create the MySQL database tables (`users`, `appointment_slots`, `bookings`) with the appropriate indexes:
```bash
npm run db:migrate
```

### Start Development Server
```bash
npm run dev
```
Upon startup, the server automatically connects to MySQL and seeds **51 appointment slots** (hourly slots from 9:00 AM to 5:00 PM for the next 7 days) if they do not already exist.

### Run Concurrency Lock Verification
To test and verify the concurrency-safe booking logic, run the automated test script while the server is running:
```bash
node concurrency-test.js
```
This script registers two separate users and submits simultaneous booking requests for the exact same slot. It verifies that one request succeeds with code `201` and the other is safely rejected with code `400`.

---

## 2. Frontend (Client) Setup

Navigate to the nested client directory:
```bash
cd booking-system-client/booking-system-client
```

### Install Dependencies
```bash
npm install
```

### Start Next.js Development Server
```bash
npm run dev
```
The client will boot up and bind to an available port, typically `http://localhost:3001` or `http://localhost:3000`.

---

## 🧪 Testing the Application Flow

1. Open your web browser to `http://localhost:3001`.
2. Click **Sign up** to register a new account.
3. Log in with your email and password.
4. On the main dashboard:
   - Use the **horizontal date slider** to select a date.
   - Click **Book Slot** on any available hourly slot to open the booking confirmation modal and book it.
   - You can only book **one slot per calendar day**; attempting to book another slot on the same day will trigger a rejection warning.
   - In the **My Bookings** panel on the right side, you can view your schedule.
   - Active bookings show a live indicator of whether they can be cancelled. If the slot is more than 2 hours in the future, you can cancel it; if it is within the 2-hour window, the **Cancel** button is disabled per business constraints.
