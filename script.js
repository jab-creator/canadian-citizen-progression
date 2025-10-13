// Canadian Citizenship Tracker Application
class CitizenshipTracker {
    constructor() {
        this.trips = [];
        this.settings = {
            prDate: null,
            targetDate: null,
            residencyStatus: 'permanent'
        };
        this.currentEditingTrip = null;
        
        this.init();
    }

    init() {
        this.loadData();
        this.bindEvents();
        this.updateDashboard();
        this.startCountdownTimer();
    }

    // Data Management
    loadData() {
        const savedTrips = localStorage.getItem('citizenship-trips');
        const savedSettings = localStorage.getItem('citizenship-settings');
        
        if (savedTrips) {
            this.trips = JSON.parse(savedTrips);
        }
        
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
            this.populateSettings();
        }
    }

    saveData() {
        localStorage.setItem('citizenship-trips', JSON.stringify(this.trips));
        localStorage.setItem('citizenship-settings', JSON.stringify(this.settings));
        
        // Sync to cloud if available
        if (window.firebaseSync) {
            window.firebaseSync.syncTrips(this.trips);
            window.firebaseSync.syncSettings(this.settings);
        }
    }

    populateSettings() {
        if (this.settings.prDate) {
            document.getElementById('prDate').value = this.settings.prDate;
        }
        if (this.settings.targetDate) {
            document.getElementById('targetDate').value = this.settings.targetDate;
        }
        document.getElementById('residencyStatus').value = this.settings.residencyStatus;
    }

    // Event Binding
    bindEvents() {
        // Tab navigation
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Trip management
        document.getElementById('addTripBtn').addEventListener('click', () => this.openTripModal());
        document.getElementById('closeModal').addEventListener('click', () => this.closeTripModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeTripModal());
        document.getElementById('overlay').addEventListener('click', () => this.closeTripModal());
        document.getElementById('tripForm').addEventListener('submit', (e) => this.saveTripForm(e));

        // Settings
        document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveSettings());

        // Data management
        document.getElementById('exportBtn').addEventListener('click', () => this.exportData());
        document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
        document.getElementById('importFile').addEventListener('change', (e) => this.importData(e));
        document.getElementById('clearDataBtn').addEventListener('click', () => this.clearAllData());
        
        // Cloud sync event listeners
        document.getElementById('manualSyncBtn').addEventListener('click', () => this.manualSync());
        document.getElementById('shareProgressBtn').addEventListener('click', () => this.generateShareLink());

        // Form interactions
        document.getElementById('reason').addEventListener('change', (e) => {
            const otherGroup = document.getElementById('otherReasonGroup');
            otherGroup.style.display = e.target.value === 'other' ? 'block' : 'none';
        });
    }

    // Tab Management
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Show/hide sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });

        if (tabName !== 'dashboard') {
            document.querySelector('.dashboard').style.display = 'none';
            document.getElementById(`${tabName}-section`).style.display = 'block';
        } else {
            document.querySelector('.dashboard').style.display = 'block';
        }

        // Update content based on tab
        if (tabName === 'trips') {
            this.renderTrips();
        }
    }

    // Trip Management
    openTripModal(trip = null) {
        this.currentEditingTrip = trip;
        const modal = document.getElementById('tripModal');
        const overlay = document.getElementById('overlay');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('tripForm');

        if (trip) {
            title.textContent = 'Edit Trip';
            document.getElementById('departureDate').value = trip.departureDate;
            document.getElementById('returnDate').value = trip.returnDate;
            document.getElementById('destination').value = trip.destination;
            document.getElementById('reason').value = trip.reason;
            
            if (trip.reason === 'other') {
                document.getElementById('otherReasonGroup').style.display = 'block';
                document.getElementById('otherReason').value = trip.otherReason || '';
            }
        } else {
            title.textContent = 'Add Trip';
            form.reset();
            document.getElementById('otherReasonGroup').style.display = 'none';
        }

        modal.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeTripModal() {
        const modal = document.getElementById('tripModal');
        const overlay = document.getElementById('overlay');
        
        modal.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        this.currentEditingTrip = null;
    }

    saveTripForm(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const trip = {
            id: this.currentEditingTrip ? this.currentEditingTrip.id : Date.now(),
            departureDate: document.getElementById('departureDate').value,
            returnDate: document.getElementById('returnDate').value,
            destination: document.getElementById('destination').value,
            reason: document.getElementById('reason').value,
            otherReason: document.getElementById('otherReason').value
        };

        // Validation
        if (new Date(trip.departureDate) >= new Date(trip.returnDate)) {
            alert('Return date must be after departure date');
            return;
        }

        if (this.currentEditingTrip) {
            const index = this.trips.findIndex(t => t.id === this.currentEditingTrip.id);
            this.trips[index] = trip;
        } else {
            this.trips.push(trip);
        }

        this.saveData();
        this.updateDashboard();
        this.renderTrips();
        this.closeTripModal();
    }

    deleteTrip(tripId) {
        if (confirm('Are you sure you want to delete this trip?')) {
            this.trips = this.trips.filter(trip => trip.id !== tripId);
            this.saveData();
            this.updateDashboard();
            this.renderTrips();
        }
    }

    renderTrips() {
        const tripsList = document.getElementById('tripsList');
        
        if (this.trips.length === 0) {
            tripsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-plane"></i>
                    <h3>No trips recorded yet</h3>
                    <p>Add your first trip to start tracking your time outside Canada</p>
                </div>
            `;
            return;
        }

        const sortedTrips = [...this.trips].sort((a, b) => new Date(b.departureDate) - new Date(a.departureDate));
        
        tripsList.innerHTML = sortedTrips.map(trip => {
            const duration = this.calculateTripDuration(trip.departureDate, trip.returnDate);
            const reasonText = trip.reason === 'other' ? trip.otherReason : trip.reason;
            
            return `
                <div class="trip-item">
                    <div class="trip-info">
                        <div class="trip-dates">
                            ${this.formatDate(trip.departureDate)} → ${this.formatDate(trip.returnDate)}
                        </div>
                        <div class="trip-details">
                            <strong>${trip.destination}</strong> • ${reasonText}
                        </div>
                    </div>
                    <div class="trip-duration">${duration} days</div>
                    <div class="trip-actions">
                        <button class="btn btn-secondary btn-small" onclick="app.openTripModal(${JSON.stringify(trip).replace(/"/g, '&quot;')})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-small" onclick="app.deleteTrip(${trip.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Calculations
    calculateTripDuration(departureDate, returnDate) {
        const departure = new Date(departureDate);
        const returnD = new Date(returnDate);
        const diffTime = Math.abs(returnD - departure);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    calculateDaysInCanada() {
        if (!this.settings.prDate) {
            return { daysInCanada: 0, eligibilityPeriodStart: null, eligibilityPeriodEnd: null };
        }

        const today = new Date();
        const prDate = new Date(this.settings.prDate);
        
        // Calculate 5-year eligibility period (from today backwards)
        const eligibilityPeriodEnd = today;
        const eligibilityPeriodStart = new Date(today);
        eligibilityPeriodStart.setFullYear(today.getFullYear() - 5);

        // Use PR date if it's later than 5 years ago
        const actualStart = prDate > eligibilityPeriodStart ? prDate : eligibilityPeriodStart;
        
        // Calculate total days in the eligibility period
        const totalDaysInPeriod = Math.ceil((eligibilityPeriodEnd - actualStart) / (1000 * 60 * 60 * 24));
        
        // Calculate days outside Canada during eligibility period
        let daysOutside = 0;
        this.trips.forEach(trip => {
            const tripStart = new Date(trip.departureDate);
            const tripEnd = new Date(trip.returnDate);
            
            // Only count trips that overlap with eligibility period
            if (tripEnd >= actualStart && tripStart <= eligibilityPeriodEnd) {
                const overlapStart = tripStart > actualStart ? tripStart : actualStart;
                const overlapEnd = tripEnd < eligibilityPeriodEnd ? tripEnd : eligibilityPeriodEnd;
                
                if (overlapStart < overlapEnd) {
                    daysOutside += Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24));
                }
            }
        });

        const daysInCanada = Math.max(0, totalDaysInPeriod - daysOutside);
        
        return {
            daysInCanada,
            eligibilityPeriodStart: actualStart,
            eligibilityPeriodEnd,
            totalDaysInPeriod,
            daysOutside
        };
    }

    calculateEstimatedEligibilityDate() {
        const calculation = this.calculateDaysInCanada();
        const daysNeeded = 1095 - calculation.daysInCanada;
        
        if (daysNeeded <= 0) {
            return null; // Already eligible - return null instead of current date
        }

        const today = new Date();
        const eligibilityDate = new Date(today);
        eligibilityDate.setDate(today.getDate() + daysNeeded);
        // Set to end of day (11:59:59 PM) to show proper countdown
        eligibilityDate.setHours(23, 59, 59, 999);
        
        return eligibilityDate;
    }

    calculateTotalTripDays() {
        return this.trips.reduce((total, trip) => {
            return total + this.calculateTripDuration(trip.departureDate, trip.returnDate);
        }, 0);
    }

    // Dashboard Updates
    calculateStats() {
        const calculation = this.calculateDaysInCanada();
        const daysInCanada = calculation.daysInCanada;
        const daysRemaining = Math.max(0, 1095 - daysInCanada);
        const progressPercentage = Math.min(100, (daysInCanada / 1095) * 100);
        const totalTripDays = this.calculateTotalTripDays();

        return {
            daysInCanada,
            daysRemaining,
            progressPercentage,
            totalTrips: this.trips.length,
            totalTripDays,
            isPRDateSet: !!this.settings.prDate
        };
    }

    updateDashboard() {
        const stats = this.calculateStats();

        // Update stats
        document.getElementById('daysInCanada').textContent = stats.daysInCanada.toLocaleString();
        document.getElementById('daysRemaining').textContent = stats.daysRemaining.toLocaleString();
        document.getElementById('progressPercent').textContent = `${stats.progressPercentage.toFixed(1)}%`;
        document.getElementById('totalTrips').textContent = stats.totalTrips;
        
        // Update total trip days if element exists
        const totalTripDaysElement = document.getElementById('totalTripDays');
        if (totalTripDaysElement) {
            totalTripDaysElement.textContent = stats.totalTripDays.toLocaleString();
        }

        // Update progress bar
        document.getElementById('progressFill').style.width = `${stats.progressPercentage}%`;
        document.getElementById('progressText').textContent = `${stats.daysInCanada.toLocaleString()} / 1,095 days`;

        // Update countdown
        this.updateCountdown();
    }

    updateCountdown() {
        const eligibilityDate = this.calculateEstimatedEligibilityDate();
        
        if (!eligibilityDate) {
            // Already eligible
            document.getElementById('countdownDays').textContent = '🎉';
            document.getElementById('countdownHours').textContent = 'ELIGIBLE';
            document.getElementById('countdownMinutes').textContent = 'NOW';
            document.getElementById('countdownSeconds').textContent = '🍁';
            return;
        }

        const now = new Date();
        const timeDiff = eligibilityDate - now;

        if (timeDiff <= 0) {
            document.getElementById('countdownDays').textContent = '🎉';
            document.getElementById('countdownHours').textContent = 'ELIGIBLE';
            document.getElementById('countdownMinutes').textContent = 'NOW';
            document.getElementById('countdownSeconds').textContent = '🍁';
            return;
        }

        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        document.getElementById('countdownDays').textContent = days;
        document.getElementById('countdownHours').textContent = hours;
        document.getElementById('countdownMinutes').textContent = minutes;
        document.getElementById('countdownSeconds').textContent = seconds;
    }

    startCountdownTimer() {
        setInterval(() => this.updateCountdown(), 1000);
    }

    // Settings Management
    saveSettings() {
        this.settings.prDate = document.getElementById('prDate').value;
        this.settings.targetDate = document.getElementById('targetDate').value;
        this.settings.residencyStatus = document.getElementById('residencyStatus').value;
        
        this.saveData();
        this.updateDashboard();
        
        alert('Settings saved successfully!');
    }

    // Data Import/Export
    exportData() {
        const data = {
            trips: this.trips,
            settings: this.settings,
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `citizenship-tracker-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.trips && data.settings) {
                    if (confirm('This will replace all your current data. Are you sure?')) {
                        this.trips = data.trips;
                        this.settings = { ...this.settings, ...data.settings };
                        this.saveData();
                        this.populateSettings();
                        this.updateDashboard();
                        this.renderTrips();
                        alert('Data imported successfully!');
                    }
                } else {
                    alert('Invalid file format');
                }
            } catch (error) {
                alert('Error reading file: ' + error.message);
            }
        };
        reader.readAsText(file);
        
        // Reset file input
        event.target.value = '';
    }

    clearAllData() {
        if (confirm('This will permanently delete all your trips and settings. This cannot be undone. Are you sure?')) {
            if (confirm('Are you absolutely sure? This action cannot be reversed.')) {
                this.trips = [];
                this.settings = {
                    prDate: null,
                    targetDate: null,
                    residencyStatus: 'permanent'
                };
                
                localStorage.removeItem('citizenship-trips');
                localStorage.removeItem('citizenship-settings');
                
                document.getElementById('tripForm').reset();
                this.populateSettings();
                this.updateDashboard();
                this.renderTrips();
                
                alert('All data has been cleared.');
            }
        }
    }

    // Manual sync to cloud
    async manualSync() {
        if (!window.firebaseSync || !window.firebaseSync.auth.currentUser) {
            this.showToast('Please sign in to sync your data', 'error');
            return;
        }

        try {
            // Update sync status
            const syncStatus = document.getElementById('syncStatus');
            syncStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Syncing...</span>';
            
            // Trigger sync
            await window.firebaseSync.syncToCloud();
            
            // Update sync status
            syncStatus.innerHTML = '<i class="fas fa-check-circle"></i> <span>Synced successfully</span>';
            this.showToast('Data synced to cloud successfully!', 'success');
            
            // Reset status after 3 seconds
            setTimeout(() => {
                syncStatus.innerHTML = '<i class="fas fa-sync-alt"></i> <span>Ready to sync</span>';
            }, 3000);
            
        } catch (error) {
            console.error('Error syncing data:', error);
            const syncStatus = document.getElementById('syncStatus');
            syncStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> <span>Sync failed</span>';
            this.showToast('Failed to sync data. Please try again.', 'error');
            
            // Reset status after 3 seconds
            setTimeout(() => {
                syncStatus.innerHTML = '<i class="fas fa-sync-alt"></i> <span>Ready to sync</span>';
            }, 3000);
        }
    }

    // Generate share link
    async generateShareLink() {
        if (!window.firebaseSync || !window.firebaseSync.auth.currentUser) {
            this.showToast('Please sign in to share your progress', 'error');
            return;
        }

        try {
            // Generate a unique share ID (using user ID for simplicity)
            const shareId = window.firebaseSync.auth.currentUser.uid;
            
            // Create the public share document
            await window.firebaseSync.createPublicShare(shareId);
            
            const shareUrl = `${window.location.origin}/share.html?id=${shareId}`;
            
            // Copy to clipboard
            navigator.clipboard.writeText(shareUrl).then(() => {
                this.showToast('Share link created and copied to clipboard!', 'success');
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = shareUrl;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.showToast('Share link created and copied to clipboard!', 'success');
            });

            // Update the share modal with the link
            const shareInput = document.getElementById('shareUrlInput');
            if (shareInput) {
                shareInput.value = shareUrl;
            }
        } catch (error) {
            console.error('Error creating share link:', error);
            this.showToast('Failed to create share link. Please try again.', 'error');
        }
    }

    // Show toast notification
    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Add to page
        document.body.appendChild(toast);
        
        // Show with animation
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Remove after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }

    // Utility Functions
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-CA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

// Initialize the application
const app = new CitizenshipTracker();
window.citizenshipTracker = app;