// Payment and Subscription Management System
class PaymentManager {
    constructor() {
        this.subscriptionStatus = 'free'; // 'free', 'premium', 'expired'
        this.subscriptionExpiry = null;
        this.paymentProvider = null; // Will be initialized with Stripe or other provider
        this.features = {
            cloudSync: false,
            sharing: false,
            // Future premium features can be added here
            advancedAnalytics: false,
            prioritySupport: false
        };
        
        this.init();
    }

    async init() {
        // Load subscription status from localStorage and cloud
        await this.loadSubscriptionStatus();
        
        // Initialize payment provider (Stripe)
        await this.initializePaymentProvider();
        
        // Check subscription validity
        this.validateSubscription();
        
        // Update UI based on subscription status
        this.updateFeatureAccess();
    }

    async loadSubscriptionStatus() {
        try {
            // First check localStorage for cached status
            const localStatus = localStorage.getItem('subscription-status');
            if (localStatus) {
                const status = JSON.parse(localStatus);
                this.subscriptionStatus = status.status || 'free';
                this.subscriptionExpiry = status.expiry ? new Date(status.expiry) : null;
            }

            // If user is authenticated, check cloud status
            if (window.firebaseSync && window.firebaseSync.auth.currentUser) {
                await this.syncSubscriptionFromCloud();
            }
        } catch (error) {
            console.error('Error loading subscription status:', error);
            this.subscriptionStatus = 'free';
        }
    }

    async syncSubscriptionFromCloud() {
        try {
            const userId = window.firebaseSync.auth.currentUser.uid;
            const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
            
            const subscriptionDoc = await getDoc(doc(window.firebaseDb, 'subscriptions', userId));
            
            if (subscriptionDoc.exists()) {
                const data = subscriptionDoc.data();
                this.subscriptionStatus = data.status || 'free';
                this.subscriptionExpiry = data.expiry ? new Date(data.expiry.seconds * 1000) : null;
                
                // Cache in localStorage
                this.saveSubscriptionStatus();
            }
        } catch (error) {
            console.error('Error syncing subscription from cloud:', error);
        }
    }

    saveSubscriptionStatus() {
        const status = {
            status: this.subscriptionStatus,
            expiry: this.subscriptionExpiry ? this.subscriptionExpiry.toISOString() : null,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('subscription-status', JSON.stringify(status));
    }

    async initializePaymentProvider() {
        try {
            // Initialize Stripe (replace with your actual publishable key)
            if (window.Stripe) {
                this.paymentProvider = window.Stripe('pk_test_51234567890abcdef_test_your_publishable_key_here');
            }
        } catch (error) {
            console.error('Error initializing payment provider:', error);
        }
    }

    validateSubscription() {
        if (this.subscriptionStatus === 'premium' && this.subscriptionExpiry) {
            if (new Date() > this.subscriptionExpiry) {
                this.subscriptionStatus = 'expired';
                this.saveSubscriptionStatus();
            }
        }

        // Update feature access based on subscription status
        this.updateFeatureAccess();
    }

    updateFeatureAccess() {
        const isPremium = this.subscriptionStatus === 'premium';
        
        this.features = {
            cloudSync: isPremium,
            sharing: isPremium,
            advancedAnalytics: isPremium,
            prioritySupport: isPremium
        };

        // Notify other components about feature access changes
        this.notifyFeatureAccessChange();
    }

    notifyFeatureAccessChange() {
        // Dispatch custom event for other components to listen to
        window.dispatchEvent(new CustomEvent('subscriptionStatusChanged', {
            detail: {
                status: this.subscriptionStatus,
                features: this.features,
                expiry: this.subscriptionExpiry
            }
        }));
    }

    // Check if a specific feature is available
    hasFeature(featureName) {
        return this.features[featureName] || false;
    }

    // Get subscription status
    getStatus() {
        return {
            status: this.subscriptionStatus,
            expiry: this.subscriptionExpiry,
            features: this.features
        };
    }

    // Show upgrade modal
    showUpgradeModal(featureName) {
        const modal = document.getElementById('upgradeModal');
        const featureNameSpan = document.getElementById('upgradeFeatureName');
        
        if (modal && featureNameSpan) {
            featureNameSpan.textContent = this.getFeatureDisplayName(featureName);
            modal.style.display = 'flex';
        }
    }

    getFeatureDisplayName(featureName) {
        const displayNames = {
            cloudSync: 'Cloud Sync',
            sharing: 'Progress Sharing',
            advancedAnalytics: 'Advanced Analytics',
            prioritySupport: 'Priority Support'
        };
        return displayNames[featureName] || featureName;
    }

    // Start subscription process
    async startSubscription(priceId = 'price_premium_monthly') {
        if (!this.paymentProvider) {
            console.error('Payment provider not initialized');
            return;
        }

        try {
            // Create checkout session on your backend
            const response = await fetch('/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    priceId: priceId,
                    userId: window.firebaseSync?.auth?.currentUser?.uid
                })
            });

            const session = await response.json();

            // Redirect to Stripe Checkout
            const result = await this.paymentProvider.redirectToCheckout({
                sessionId: session.id
            });

            if (result.error) {
                console.error('Stripe checkout error:', result.error);
                this.showToast('Payment failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Error starting subscription:', error);
            this.showToast('Unable to start subscription process. Please try again.', 'error');
        }
    }

    // Handle successful payment (called from success page or webhook)
    async handleSuccessfulPayment(subscriptionData) {
        try {
            this.subscriptionStatus = 'premium';
            this.subscriptionExpiry = new Date(subscriptionData.expiry);
            
            // Save to localStorage
            this.saveSubscriptionStatus();
            
            // Save to cloud if user is authenticated
            if (window.firebaseSync && window.firebaseSync.auth.currentUser) {
                await this.saveSubscriptionToCloud(subscriptionData);
            }
            
            // Update feature access
            this.updateFeatureAccess();
            
            this.showToast('Welcome to Premium! Cloud features are now available.', 'success');
        } catch (error) {
            console.error('Error handling successful payment:', error);
        }
    }

    async saveSubscriptionToCloud(subscriptionData) {
        try {
            const userId = window.firebaseSync.auth.currentUser.uid;
            const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
            
            await setDoc(doc(window.firebaseDb, 'subscriptions', userId), {
                status: 'premium',
                expiry: new Date(subscriptionData.expiry),
                stripeCustomerId: subscriptionData.customerId,
                stripeSubscriptionId: subscriptionData.subscriptionId,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error saving subscription to cloud:', error);
        }
    }

    // Cancel subscription
    async cancelSubscription() {
        try {
            const response = await fetch('/cancel-subscription', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: window.firebaseSync?.auth?.currentUser?.uid
                })
            });

            if (response.ok) {
                this.subscriptionStatus = 'expired';
                this.saveSubscriptionStatus();
                this.updateFeatureAccess();
                this.showToast('Subscription cancelled. You can continue using free features.', 'info');
            }
        } catch (error) {
            console.error('Error cancelling subscription:', error);
            this.showToast('Unable to cancel subscription. Please contact support.', 'error');
        }
    }

    // Utility method to show toast messages
    showToast(message, type = 'info') {
        if (window.tracker && window.tracker.showToast) {
            window.tracker.showToast(message, type);
        } else {
            // Fallback alert
            alert(message);
        }
    }

    // Get pricing information
    getPricingInfo() {
        return {
            monthly: {
                price: '$4.99',
                priceId: 'price_premium_monthly',
                features: [
                    'Cloud Sync across all devices',
                    'Share progress with others',
                    'Advanced analytics',
                    'Priority email support',
                    'Automatic backups'
                ]
            },
            yearly: {
                price: '$49.99',
                priceId: 'price_premium_yearly',
                features: [
                    'All monthly features',
                    '2 months free (save 17%)',
                    'Priority feature requests'
                ]
            }
        };
    }
}

// Initialize payment manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.paymentManager = new PaymentManager();
});