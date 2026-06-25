# KissanBhai — Setup Guide

## Before You Open in Android Studio

### 1. Create Firebase Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project called **KissanBhai**
3. Add an **Android** app with package name: `com.kissanbhai.app`
4. Download `google-services.json` and place it in the `app/` folder
5. Enable **Authentication** → Email/Password sign-in
6. Enable **Cloud Firestore** → Start in production mode

### 2. Create Admin Account
In Firebase Console → Authentication → Users → Add user:
- Email: (your brother's email)
- Password: (set a strong password)

### 3. Firestore Security Rules
In Firebase Console → Firestore → Rules, paste:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4. Create Firestore Indexes
These composite indexes are needed for queries:
- Collection: `transactions` — Fields: `category` ASC, `date` DESC
- Collection: `transactions` — Fields: `customerId` ASC, `date` DESC

(Firebase will prompt you in Logcat when the app first runs if these are missing — click the link to create them.)

### 5. Open in Android Studio
1. Open Android Studio
2. File → Open → select this `kissanbhai/` folder
3. Wait for Gradle sync to finish
4. Run on device or emulator (API 24+)

## App Usage
- Sign in with the admin email/password
- Home: see overall stats for both businesses
- Tap **Pesticide** or **Solar** tile to view that category
- Tap **+** to add a new entry
- Type customer name → suggestions appear → select existing or add new
- Add items with price and amount paid — balance auto-calculates
- Tap any entry to see details or record a payment
