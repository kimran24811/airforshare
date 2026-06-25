# KissanBhai — Expo Setup Guide

## Step 1: Paste Your Firebase Config

Open `src/config/firebase.ts` and replace the placeholder values with your
actual Firebase config (copied from Firebase Console → Project Settings → Your web app):

```ts
const firebaseConfig = {
  apiKey: 'AIzaSy...',
  authDomain: 'kissanbhai-xxxxx.firebaseapp.com',
  projectId: 'kissanbhai-xxxxx',
  storageBucket: 'kissanbhai-xxxxx.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abc123',
};
```

## Step 2: Install & Run

```bash
npm install
npx expo start
```

Scan the QR code with the **Expo Go** app on your Android phone.

## Step 3: Firestore Composite Indexes

When you first run the app, Firestore may log errors with clickable links to
create the required indexes. Click those links, or manually create:

| Collection     | Field 1           | Field 2              |
|----------------|-------------------|----------------------|
| transactions   | category (Asc)    | date (Desc)          |
| transactions   | customerId (Asc)  | date (Desc)          |

## Build APK (for distribution)

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

This builds a standalone APK you can install directly on Android.
