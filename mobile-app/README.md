# Neomad Delivery - Mobile Application

A premium, high-performance Flutter application designed for modern logistics and delivery management. Built with a focus on real-time tracking, geofencing, and seamless operational workflows.

## 🚀 Key Features

### 🏢 Staff Portal (Geofencing)
- **Real-Time Geofence Monitoring**: Automatically tracks staff location relative to the Neomad Office (100m radius).
- **Dynamic Presence UI**: Smooth transitions between "Inside" and "Outside" status with micro-animations.
- **Automated Alerts**: Triggers real-time alerts to the backend if a staff member leaves the premises.

### 🛵 Delivery Boy Portal (Lifecycle)
- **Active Shift Tracking**: Online/Offline toggle with a live ticking timer to monitor shift duration.
- **Task Management**: Structured workflow for managing Available, Active, and Completed tasks.
- **Real-Time Status Updates**: Instant toggles for 'Moving', 'Waiting', and 'Arrived' statuses.
- **Intelligent Waiting Alerts**: Automatic detection and alerting for excessive wait times at delivery points.
- **Digital Proof of Delivery (POD)**:
  - Multi-method payment collection (Cash/Cheque).
  - Validation-backed financial data entry.
  - Photo/Signature capture support.

### 👤 User Experience
- **Role-Based Access**: Dedicated dashboards for Staff and Delivery personnel.
- **Modern Design System**: Sleek Zinc/Emerald theme with Outfit typography and Lucide icons.
- **Edge-to-Edge Navigation**: Fully compatible with modern Android Gesture and 3-button navigation.
- **Developer Utility**: Integrated auth-helpers for rapid testing of different user roles.

## 🛠️ Tech Stack

- **Framework**: Flutter (Material 3)
- **State Management**: [Riverpod](https://riverpod.dev/) (2.x)
- **Navigation**: [GoRouter](https://pub.dev/packages/go_router)
- **Maps**: [Flutter Map](https://docs.fleaflet.dev/) (with CartoDB Voyager tiles)
- **Icons**: [Lucide Icons](https://lucideicons.com/)
- **Animations**: [Flutter Animate](https://pub.dev/packages/flutter_animate)
- **Platform**: Android & iOS (Edge-to-edge support enabled)

## 📂 Project Structure

```text
lib/
├── common/             # Global theme, colors, and shared widgets (TopBar)
├── data/               # Mock API layer with simulated latency
├── features/           # Feature-first organization
│   ├── auth/           # Login, Authentication, and Profile screens
│   ├── delivery/       # Delivery dashboards, task cards, and POD logic
│   └── staff/          # Staff dashboard and location tracking logic
├── models/             # Shared data models (User, Invoice, Notification)
├── main.dart           # App entry point & system UI configuration
└── router.dart         # Centralized GoRouter configuration
```

## 🚥 Getting Started

### Prerequisites
- Flutter SDK (Latest Stable)
- Android Studio / VS Code
- An Android/iOS Emulator or Physical Device

### Installation
1.  **Clone the repository and navigate to the app folder:**
    ```bash
    cd mobile-app
    ```
2.  **Get dependencies:**
    ```bash
    flutter pub get
    ```
3.  **Run the app:**
    ```bash
    flutter run
    ```

### 🔑 Test Credentials
- **Staff**: `username: staff`, `password: password`
- **Delivery Boy**: `username: delivery`, `password: password`
*(Quick-fill buttons are available on the login screen for easier testing)*

---
**Made by BeForth**
© 2026 Neomad App Solutions
