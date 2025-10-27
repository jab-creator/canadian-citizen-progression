// Firebase Authentication Module
class FirebaseAuthManager {
    constructor() {
        this.auth = null;
        this.user = null;
        this.onAuthStateChangedCallbacks = [];
        
        // Wait for Firebase to be available
        this.waitForFirebase().then(() => {
            this.init();
        });
    }

    async waitForFirebase() {
        while (!window.firebaseAuth) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        this.auth = window.firebaseAuth;
    }

    init() {
        // Import Firebase Auth methods
        this.importFirebaseAuth().then(() => {
            // Listen for auth state changes
            this.auth.onAuthStateChanged((user) => {
                this.user = user;
                this.updateUI();
                this.notifyAuthStateChanged(user);
            });

            // Bind event listeners
            this.bindEvents();
        });
    }

    async importFirebaseAuth() {
        const { 
            GoogleAuthProvider, 
            signInWithPopup, 
            signInWithEmailLink, 
            sendSignInLinkToEmail,
            signOut,
            isSignInWithEmailLink
        } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js');
        
        this.GoogleAuthProvider = GoogleAuthProvider;
        this.signInWithPopup = signInWithPopup;
        this.signInWithEmailLink = signInWithEmailLink;
        this.sendSignInLinkToEmail = sendSignInLinkToEmail;
        this.signOut = signOut;
        this.isSignInWithEmailLink = isSignInWithEmailLink;
    }

    bindEvents() {
        // Sign in button
        document.getElementById('signInBtn').addEventListener('click', () => {
            this.showSignInModal();
        });

        // Google sign in
        document.getElementById('googleSignInBtn').addEventListener('click', () => {
            this.signInWithGoogle();
        });

        // Email sign in
        document.getElementById('emailSignInBtn').addEventListener('click', () => {
            this.signInWithEmail();
        });

        // Sign out
        document.getElementById('signOutBtn').addEventListener('click', () => {
            this.signOutUser();
        });

        // Share button
        document.getElementById('shareBtn').addEventListener('click', () => {
            this.showShareModal();
        });

        // Copy link button
        document.getElementById('copyLinkBtn').addEventListener('click', () => {
            this.copyShareLink();
        });

        // Modal close buttons
        document.getElementById('closeSignInModal').addEventListener('click', () => {
            this.hideSignInModal();
        });

        document.getElementById('closeShareModal').addEventListener('click', () => {
            this.hideShareModal();
        });

        // Check if user is completing email link sign in
        this.checkEmailLinkSignIn();
    }

    async signInWithGoogle() {
        try {
            const provider = new this.GoogleAuthProvider();
            const result = await this.signInWithPopup(this.auth, provider);
            
            this.hideSignInModal();
            this.showSuccessMessage('Successfully signed in with Google!');
            
            // Trigger data migration
            if (window.firebaseSync) {
                await window.firebaseSync.migrateLocalDataToCloud();
            }
        } catch (error) {
            console.error('Google sign in error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            
            // More specific error messages
            if (error.code === 'auth/unauthorized-domain') {
                this.showErrorMessage('This domain is not authorized for authentication. Please contact support.');
            } else if (error.code === 'auth/popup-blocked') {
                this.showErrorMessage('Popup was blocked. Please allow popups and try again.');
            } else if (error.code === 'auth/popup-closed-by-user') {
                this.showErrorMessage('Sign-in was cancelled. Please try again.');
            } else {
                this.showErrorMessage(`Failed to sign in with Google: ${error.message}`);
            }
        }
    }

    async signInWithEmail() {
        const email = document.getElementById('emailInput').value.trim();
        
        if (!email) {
            this.showErrorMessage('Please enter your email address.');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showErrorMessage('Please enter a valid email address.');
            return;
        }

        try {
            // Construct proper ActionCodeSettings
            const actionCodeSettings = {
                // Use the current origin for the redirect URL
                url: window.location.origin + window.location.pathname,
                // This must be true for email link sign-in
                handleCodeInApp: true,
            };

            console.log('Sending sign-in link with settings:', actionCodeSettings);
            
            await this.sendSignInLinkToEmail(this.auth, email, actionCodeSettings);
            
            // Save email for completing sign in
            localStorage.setItem('emailForSignIn', email);
            
            this.hideSignInModal();
            this.showSuccessMessage(`Magic link sent to ${email}! Check your inbox and click the link to sign in.`);
        } catch (error) {
            console.error('Email sign in error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            
            // Provide more specific error messages
            let errorMessage = 'Failed to send magic link. ';
            
            switch (error.code) {
                case 'auth/operation-not-allowed':
                    errorMessage += 'Email link sign-in is not enabled. Please contact support.';
                    break;
                case 'auth/invalid-email':
                    errorMessage += 'Invalid email address.';
                    break;
                case 'auth/unauthorized-domain':
                    errorMessage += 'This domain is not authorized. Please contact support.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage += 'Too many requests. Please try again later.';
                    break;
                default:
                    errorMessage += `Error: ${error.message}`;
            }
            
            this.showErrorMessage(errorMessage);
        }
    }

    async checkEmailLinkSignIn() {
        // Check if the current URL is a sign-in with email link
        if (this.isSignInWithEmailLink(this.auth, window.location.href)) {
            console.log('Detected email link sign-in attempt');
            
            // Get the email if available from localStorage
            let email = localStorage.getItem('emailForSignIn');
            
            if (!email) {
                // User opened the link on a different device
                // Ask for email to prevent session fixation attacks
                email = window.prompt('Please provide your email for confirmation');
            }

            if (!email) {
                this.showErrorMessage('Email is required to complete sign-in.');
                return;
            }

            try {
                console.log('Completing email link sign-in for:', email);
                
                const result = await this.signInWithEmailLink(this.auth, email, window.location.href);
                
                // Clear email from storage
                localStorage.removeItem('emailForSignIn');
                
                console.log('Email link sign-in successful:', result.user);
                
                this.showSuccessMessage('Successfully signed in with magic link!');
                
                // Trigger data migration
                if (window.firebaseSync) {
                    await window.firebaseSync.migrateLocalDataToCloud();
                }
                
                // Clean up URL to remove the email link parameters
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (error) {
                console.error('Email link sign in error:', error);
                console.error('Error code:', error.code);
                console.error('Error message:', error.message);
                
                let errorMessage = 'Failed to complete sign in. ';
                
                switch (error.code) {
                    case 'auth/invalid-email':
                        errorMessage += 'Invalid email address.';
                        break;
                    case 'auth/invalid-action-code':
                        errorMessage += 'The sign-in link is invalid or has expired.';
                        break;
                    case 'auth/expired-action-code':
                        errorMessage += 'The sign-in link has expired. Please request a new one.';
                        break;
                    default:
                        errorMessage += `Error: ${error.message}`;
                }
                
                this.showErrorMessage(errorMessage);
            }
        }
    }

    async signOutUser() {
        try {
            await this.signOut(this.auth);
            this.showSuccessMessage('Successfully signed out.');
        } catch (error) {
            console.error('Sign out error:', error);
            this.showErrorMessage('Failed to sign out. Please try again.');
        }
    }

    updateUI() {
        const signInSection = document.getElementById('signInSection');
        const userSection = document.getElementById('userSection');
        const userEmail = document.getElementById('userEmail');
        const cloudSyncCard = document.getElementById('cloudSyncCard');
        const shareProgressCard = document.getElementById('shareProgressCard');

        if (this.user) {
            // User is signed in
            signInSection.style.display = 'none';
            userSection.style.display = 'block';
            userEmail.textContent = this.user.email;
            
            // Show cloud features
            if (cloudSyncCard) cloudSyncCard.style.display = 'block';
            if (shareProgressCard) shareProgressCard.style.display = 'block';
        } else {
            // User is signed out
            signInSection.style.display = 'block';
            userSection.style.display = 'none';
            
            // Hide cloud features
            if (cloudSyncCard) cloudSyncCard.style.display = 'none';
            if (shareProgressCard) shareProgressCard.style.display = 'none';
        }
    }

    showSignInModal() {
        document.getElementById('signInModal').style.display = 'block';
        document.getElementById('overlay').style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    hideSignInModal() {
        document.getElementById('signInModal').style.display = 'none';
        document.getElementById('overlay').style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Clear email input
        document.getElementById('emailInput').value = '';
    }

    async showShareModal() {
        if (!this.user) {
            this.showSignInModal();
            return;
        }

        // Generate share link
        const shareId = await this.generateShareId();
        const shareLink = `${window.location.origin}/share/${shareId}`;
        
        document.getElementById('shareLink').value = shareLink;
        
        // Update preview
        this.updateSharePreview();
        
        document.getElementById('shareModal').style.display = 'block';
        document.getElementById('overlay').style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    hideShareModal() {
        document.getElementById('shareModal').style.display = 'none';
        document.getElementById('overlay').style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    async generateShareId() {
        // Generate a unique share ID for the user
        if (!this.user) return null;
        
        // Use user UID as share ID for now (V1 - simple approach)
        return this.user.uid;
    }

    updateSharePreview() {
        // Get current stats from the main app
        if (window.citizenshipTracker) {
            const stats = window.citizenshipTracker.calculateStats();
            document.getElementById('previewDays').textContent = stats.daysInCanada;
            document.getElementById('previewProgress').textContent = Math.round(stats.progressPercentage);
            document.getElementById('previewTrips').textContent = stats.totalTrips;
        }
    }

    copyShareLink() {
        const shareLink = document.getElementById('shareLink');
        shareLink.select();
        shareLink.setSelectionRange(0, 99999); // For mobile devices
        
        try {
            document.execCommand('copy');
            this.showSuccessMessage('Share link copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy link:', err);
            this.showErrorMessage('Failed to copy link. Please copy it manually.');
        }
    }

    // Utility methods
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showSuccessMessage(message) {
        // Create a simple toast notification
        this.showToast(message, 'success');
    }

    showErrorMessage(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        // Remove existing toasts
        const existingToasts = document.querySelectorAll('.toast');
        existingToasts.forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Hide toast after 4 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // Auth state change callbacks
    onAuthStateChanged(callback) {
        this.onAuthStateChangedCallbacks.push(callback);
    }

    notifyAuthStateChanged(user) {
        this.onAuthStateChangedCallbacks.forEach(callback => {
            try {
                callback(user);
            } catch (error) {
                console.error('Auth state change callback error:', error);
            }
        });
    }

    // Public getters
    getCurrentUser() {
        return this.user;
    }

    isSignedIn() {
        return !!this.user;
    }
}

// Initialize Firebase Auth Manager
window.firebaseAuthManager = new FirebaseAuthManager();