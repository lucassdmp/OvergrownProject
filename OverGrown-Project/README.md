# Overgrown Project

A modern React application built with TypeScript, Vite, and Firebase integration.

## Features

- ⚛️ React 19 with TypeScript
- 🔥 Firebase Authentication & Firestore
- 🎨 Theme Provider (Light/Dark mode)
- 🛣️ React Router DOM for navigation
- 🔐 Protected routes with authentication
- 📱 Responsive design
- 🎯 Component-based architecture
- 🔧 Custom hooks and utilities

## Project Structure

```
src/
├── components/          # Reusable components (each in own folder)
│   ├── Header/
│   ├── Footer/
│   └── PrivateRoute/
├── config/             # Configuration files
│   └── firebase.ts
├── hooks/              # Custom React hooks
│   ├── useLocalStorage.ts
│   └── useWindowSize.ts
├── layouts/            # Layout components
│   └── MainLayout/
├── pages/              # Page components
│   ├── Home/
│   ├── Login/
│   ├── Signup/
│   └── Dashboard/
├── providers/          # Context providers
│   ├── AuthProvider.tsx
│   ├── ThemeProvider.tsx
│   ├── RouteProvider.tsx
│   └── AppProvider.tsx
├── routes/             # Route definitions
│   └── AppRoutes.tsx
├── services/           # API and service layers
│   └── firestoreService.ts
├── types/              # TypeScript type definitions
│   └── index.ts
├── utils/              # Utility functions
│   ├── helpers.ts
│   └── constants.ts
├── App.tsx
└── main.tsx
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repository-url>
cd overgrown-project
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory (use `.env.example` as template):
```bash
cp .env.example .env
```

4. Add your Firebase configuration to the `.env` file:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Authentication (Email/Password)
4. Enable Firestore Database
5. Get your configuration from Project Settings
6. Add the configuration to your `.env` file

### Running the Application

Development mode:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Features Overview

### Authentication
- Email/Password authentication with Firebase
- Protected routes
- Login, Signup, and Password Reset functionality

### Theme Management
- Light and Dark themes
- Persistent theme preference
- Smooth theme transitions

### Routing
- Client-side routing with React Router
- Protected routes for authenticated users
- 404 redirect handling

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
