# Firebase Setup Guide 🔥

This guide will help you set up Firebase for cloud storage and sharing features in your Canadian Citizenship Tracker.

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name (e.g., "citizenship-tracker")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Authentication

1. In your Firebase project, go to **Authentication** in the left sidebar
2. Click **Get started**
3. Go to **Sign-in method** tab
4. Enable the following providers:
   - **Google**: Click Google → Enable → Save
   - **Email/Password**: Click Email/Password → Enable → Save
   - **Email link (passwordless sign-in)**: Enable this option in Email/Password settings

## Step 3: Enable Firestore Database

1. Go to **Firestore Database** in the left sidebar
2. Click **Create database**
3. Choose **Start in test mode** (we'll secure it later)
4. Select a location close to your users (e.g., us-central1)
5. Click **Done**

## Step 4: Configure Security Rules

1. In Firestore Database, go to **Rules** tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow public read access for sharing (but not write)
    match /users/{userId} {
      allow read: if true;
    }
  }
}
```

3. Click **Publish**

## Step 5: Get Firebase Configuration

1. Go to **Project Settings** (gear icon in left sidebar)
2. Scroll down to **Your apps** section
3. Click **Web app** icon (`</>`)
4. Enter app nickname (e.g., "citizenship-tracker-web")
5. Check "Also set up Firebase Hosting" (optional)
6. Click **Register app**
7. Copy the `firebaseConfig` object

## Step 6: Configure Your App

1. Copy `firebase-config.template.js` to `firebase-config.js`
2. Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456789012345678"
};
```

3. Update `index.html` to use your config:

Replace this section:
```html
// Your web app's Firebase configuration
// TODO: Replace with your actual Firebase config
const firebaseConfig = {
    apiKey: "your-api-key",
    // ... other placeholder values
};
```

With:
```html
// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456789012345678"
};
```

4. Do the same for `share.html`

## Step 7: Test Your Setup

1. Open your app in a web browser
2. Click "Save to Cloud" button
3. Try signing in with Google or email
4. Add some test data and verify it syncs
5. Try the sharing feature

## Step 8: Set Up Custom Domain (Optional)

If you want custom sharing URLs like `yoursite.com/share/abc123`:

1. Set up Firebase Hosting:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init hosting
   firebase deploy
   ```

2. Configure URL rewriting in `firebase.json`:
   ```json
   {
     "hosting": {
       "public": ".",
       "rewrites": [
         {
           "source": "/share/**",
           "destination": "/share.html"
         }
       ]
     }
   }
   ```

## Cost Estimation

Firebase pricing for your use case:

### Free Tier (Spark Plan)
- **Firestore**: 1 GiB storage, 50K reads/day, 20K writes/day
- **Authentication**: Unlimited users
- **Hosting**: 10 GiB storage, 10 GiB transfer/month

### Your Expected Usage
- **Storage**: ~10KB per user (very small)
- **Reads**: ~100 per active user per day
- **Writes**: ~10 per active user per day

**Result**: You should stay within the free tier indefinitely unless you get thousands of active users.

### Paid Tier (if needed)
- **Firestore**: $0.18 per 100K reads, $0.18 per 100K writes
- **Storage**: $0.18/GiB/month

Even with 1000 active users, your monthly cost would be under $5.

## Security Best Practices

1. **Never commit your Firebase config to public repositories** if it contains sensitive data
2. **Use Firebase Security Rules** to protect user data
3. **Enable App Check** for production apps (optional)
4. **Monitor usage** in Firebase Console to detect unusual activity

## Troubleshooting

### Common Issues

1. **"Firebase not defined" error**
   - Make sure Firebase scripts load before your app scripts
   - Check browser console for network errors

2. **Authentication not working**
   - Verify your domain is added to authorized domains in Firebase Console
   - Check that authentication providers are enabled

3. **Firestore permission denied**
   - Verify your security rules allow the operation
   - Make sure user is authenticated for protected operations

4. **Sharing links not working**
   - Verify the share ID format matches your URL structure
   - Check that Firestore rules allow public read access

### Getting Help

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Support](https://firebase.google.com/support)
- [Stack Overflow - Firebase](https://stackoverflow.com/questions/tagged/firebase)

## Next Steps

Once Firebase is set up, you can:

1. **Deploy to Firebase Hosting** for a professional URL
2. **Add analytics** to track usage
3. **Implement push notifications** for eligibility reminders
4. **Add more sharing options** (social media, QR codes)
5. **Create admin dashboard** for user management

---

**Need help?** Create an issue in the repository or check the troubleshooting section above.