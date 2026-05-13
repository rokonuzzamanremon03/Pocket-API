# 🚀 Pocket API - The Ultimate SMS Gateway

Pocket API is a complete, full-stack SMS Gateway solution that transforms your Android device into a programmable SMS server. It features a beautiful Next.js web dashboard for developers and a robust Flutter background service for Android.

## ✨ Features
- **Developer Dashboard:** Manage devices, API keys, and track SMS status in real-time.
- **Secure OAuth Login:** Authenticate using Google or GitHub via Supabase.
- **Real-time Synchronization:** Instant updates between the web dashboard and mobile device using Supabase Realtime.
- **Background Android Service:** The Flutter app runs silently in the background and listens for pending SMS requests.
- **Dual SIM Support:** Automatically detects hardware SIM slots and routes SMS through the preferred network.
- **Fail-safe Delivery:** Bypasses Android background restrictions using explicit Broadcast Receivers to ensure 100% SMS delivery.

## 🛠️ Tech Stack
* **Frontend/Web:** Next.js 15, React, Tailwind CSS
* **Backend/Database:** Supabase (PostgreSQL), Row Level Security (RLS), Supabase Auth
* **Mobile App:** Flutter, Dart, Android Native Channels (Kotlin)

## 📦 How it Works
1. **Generate API Key:** Developer logs into the web dashboard and generates a secret API key.
2. **Connect Device:** Enter the API key into the Pocket API Android App and start the background service.
3. **Send SMS:** The web app pushes a message payload to the Supabase database.
4. **Trigger:** The Android app receives the real-time payload, triggers a native Kotlin Broadcast, and fires the SMS locally!

## 🔐 Security
* All API keys and user data are strictly protected by Supabase Row Level Security (RLS).
* Environment variables are kept hidden and are not pushed to this repository.

---
*Built with ❤️ by [Your Name / Rokon Uz Zaman Remon]*