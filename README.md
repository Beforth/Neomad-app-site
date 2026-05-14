<div align="center">
<img width="1200" height="475" alt="GHBanner" >
</div>

# Neomed Delivery Management System

A comprehensive system for managing invoices, tracking deliveries in real-time, and managing delivery personnel.

## Run Locally

**Prerequisites:**  Node.js!

1. Install dependencies:
   `npm install`
2. Configure your environment variables in `.env` (refer to `.env.example`). Set `VITE_API_BASE_URL` to your backend (e.g. `http://localhost:8080`).
3. Optional **browser push** (admin/manager): set the `VITE_FIREBASE_*` and **`VITE_FIREBASE_VAPID_KEY`** (Firebase Console → Cloud Messaging → Web Push certificates — **public** key only). Never commit service account JSON or VAPID **private** keys. The backend must have **`FCM_SERVICE_ACCOUNT_JSON`** pointing at a service account file path to send pushes.
4. Run the app:
   `npm run dev`  
   Vite generates `public/firebase-messaging-sw.js` from your `.env` (file is gitignored).

## Deployment

This project is configured for deployment on Vercel.
