# Loop Finance

Loop is a mobile-first financial allocation app focused on assigning income before it is spent.

## Stack

- Vue 3 + Vite
- TypeScript
- Vue Router
- vue-i18n for English and French
- Firebase Auth, Firestore, Cloud Functions, and Hosting
- Capacitor for iOS and Android apps

## Getting Started

Install dependencies:

```sh
npm install
```

Start the web app:

```sh
npm run dev
```

Build for production:

```sh
npm run build
```

Initialize native projects after dependencies are installed:

```sh
npm run cap:add:ios
npm run cap:add:android
```

Sync web assets to native projects:

```sh
npm run cap:sync
```

## Environment

Copy `.env.example` to `.env` and fill in the Firebase values.
