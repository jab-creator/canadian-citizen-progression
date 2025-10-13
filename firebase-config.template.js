// Firebase Configuration Template
// 
// INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project (or use existing one)
// 3. Enable Authentication with Google and Email/Password providers
// 4. Enable Firestore Database
// 5. Copy your Firebase config from Project Settings > General > Your apps
// 6. Replace the values below with your actual Firebase configuration
// 7. Rename this file to firebase-config.js
// 8. Update the imports in index.html and share.html to use your config

const firebaseConfig = {
    apiKey: "your-api-key-here",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456789012345678"
};

// Export for use in other files
window.firebaseConfig = firebaseConfig;