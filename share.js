// Share Page JavaScript
class SharePageManager {
    constructor() {
        this.db = null;
        this.shareId = null;
        
        // Wait for Firebase to be available
        this.waitForFirebase().then(() => {
            this.init();
        });
    }

    async waitForFirebase() {
        while (!window.firebaseDb) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        this.db = window.firebaseDb;
    }

    async init() {
        // Import Firestore methods
        await this.importFirestore();
        
        // Get share ID from URL
        this.shareId = this.getShareIdFromUrl();
        
        if (!this.shareId) {
            this.showError('Invalid share link');
            return;
        }

        // Load shared data
        await this.loadSharedData();
    }

    async importFirestore() {
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
        this.doc = doc;
        this.getDoc = getDoc;
    }

    getShareIdFromUrl() {
        // Extract share ID from URL
        // Expected formats:
        // /share/USER_ID
        // /share.html?id=USER_ID
        // #share/USER_ID
        
        const path = window.location.pathname;
        const hash = window.location.hash;
        const search = window.location.search;
        
        // Check path: /share/USER_ID
        const pathMatch = path.match(/\/share\/([^\/]+)/);
        if (pathMatch) {
            return pathMatch[1];
        }
        
        // Check hash: #share/USER_ID
        const hashMatch = hash.match(/#share\/([^\/]+)/);
        if (hashMatch) {
            return hashMatch[1];
        }
        
        // Check query parameter: ?id=USER_ID
        const urlParams = new URLSearchParams(search);
        const idParam = urlParams.get('id');
        if (idParam) {
            return idParam;
        }
        
        return null;
    }

    async loadSharedData() {
        try {
            const userDocRef = this.doc(this.db, 'users', this.shareId);
            const userDoc = await this.getDoc(userDocRef);
            
            if (!userDoc.exists()) {
                this.showError('Shared data not found');
                return;
            }

            const userData = userDoc.data();
            const stats = this.calculatePublicStats(userData.trips || [], userData.settings || {});
            
            this.displayStats(stats);
            this.showSuccess();
            
        } catch (error) {
            console.error('Error loading shared data:', error);
            this.showError('Failed to load shared data');
        }
    }

    calculatePublicStats(trips, settings) {
        const prDate = settings.prDate ? new Date(settings.prDate) : null;
        const today = new Date();
        
        let daysOutside = 0;
        let totalTrips = trips.length;
        
        trips.forEach(trip => {
            const departure = new Date(trip.departureDate);
            const returnDate = new Date(trip.returnDate);
            const tripDays = Math.ceil((returnDate - departure) / (1000 * 60 * 60 * 24));
            daysOutside += tripDays;
        });
        
        const totalDaysSincePR = prDate ? Math.ceil((today - prDate) / (1000 * 60 * 60 * 24)) : 0;
        const daysInCanada = Math.max(0, totalDaysSincePR - daysOutside);
        const progressPercentage = Math.min(100, (daysInCanada / 1095) * 100);
        const daysRemaining = Math.max(0, 1095 - daysInCanada);
        
        return {
            daysInCanada,
            progressPercentage,
            daysRemaining,
            totalTrips,
            isPRDateSet: !!prDate
        };
    }

    displayStats(stats) {
        // Update progress bar
        document.getElementById('sharedProgressFill').style.width = `${stats.progressPercentage}%`;
        document.getElementById('sharedProgressText').textContent = `${stats.daysInCanada.toLocaleString()} / 1,095 days`;
        
        // Update stat numbers
        document.getElementById('sharedDaysInCanada').textContent = stats.daysInCanada.toLocaleString();
        document.getElementById('sharedProgressPercent').textContent = `${Math.round(stats.progressPercentage)}%`;
        document.getElementById('sharedDaysRemaining').textContent = stats.daysRemaining.toLocaleString();
        document.getElementById('sharedTotalTrips').textContent = stats.totalTrips.toLocaleString();
        
        // Add some animation
        this.animateNumbers();
    }

    animateNumbers() {
        const numberElements = document.querySelectorAll('.shared-stat-number');
        
        numberElements.forEach(element => {
            const finalValue = element.textContent;
            const numericValue = parseInt(finalValue.replace(/[^\d]/g, ''));
            
            if (isNaN(numericValue)) return;
            
            let currentValue = 0;
            const increment = Math.ceil(numericValue / 50);
            const timer = setInterval(() => {
                currentValue += increment;
                if (currentValue >= numericValue) {
                    currentValue = numericValue;
                    clearInterval(timer);
                }
                
                if (finalValue.includes('%')) {
                    element.textContent = `${currentValue}%`;
                } else {
                    element.textContent = currentValue.toLocaleString();
                }
            }, 30);
        });
        
        // Animate progress bar
        setTimeout(() => {
            const progressFill = document.getElementById('sharedProgressFill');
            const targetWidth = progressFill.style.width;
            progressFill.style.width = '0%';
            setTimeout(() => {
                progressFill.style.width = targetWidth;
            }, 100);
        }, 500);
    }

    showSuccess() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('errorState').style.display = 'none';
        document.getElementById('successState').style.display = 'block';
    }

    showError(message) {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('successState').style.display = 'none';
        document.getElementById('errorState').style.display = 'block';
        
        const errorElement = document.getElementById('errorState');
        const messageElement = errorElement.querySelector('p');
        if (messageElement) {
            messageElement.textContent = message || 'This shared link may be invalid or the data is no longer available.';
        }
    }
}

// Initialize the share page manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SharePageManager();
});