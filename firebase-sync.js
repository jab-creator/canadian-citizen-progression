// Firebase Data Synchronization Module
class FirebaseSyncManager {
    constructor() {
        this.db = null;
        this.auth = null;
        this.isOnline = navigator.onLine;
        this.syncQueue = [];
        this.lastSyncTime = null;
        
        // Wait for Firebase to be available
        this.waitForFirebase().then(() => {
            this.init();
        });
    }

    async waitForFirebase() {
        while (!window.firebaseDb || !window.firebaseAuth) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        this.db = window.firebaseDb;
        this.auth = window.firebaseAuth;
    }

    async init() {
        // Import Firestore methods
        await this.importFirestore();
        
        // Listen for online/offline status
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processSyncQueue();
            this.updateSyncStatus('online');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateSyncStatus('offline');
        });

        // Listen for auth state changes
        if (window.firebaseAuthManager) {
            window.firebaseAuthManager.onAuthStateChanged((user) => {
                if (user) {
                    this.loadDataFromCloud();
                } else {
                    this.clearCloudData();
                }
            });
        }

        // Update sync status initially
        this.updateSyncStatus(this.isOnline ? 'online' : 'offline');
    }

    async importFirestore() {
        const { 
            doc, 
            getDoc, 
            setDoc, 
            updateDoc,
            onSnapshot,
            serverTimestamp,
            enableNetwork,
            disableNetwork
        } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
        
        this.doc = doc;
        this.getDoc = getDoc;
        this.setDoc = setDoc;
        this.updateDoc = updateDoc;
        this.onSnapshot = onSnapshot;
        this.serverTimestamp = serverTimestamp;
        this.enableNetwork = enableNetwork;
        this.disableNetwork = disableNetwork;
    }

    // Data Migration from localStorage to Cloud
    async migrateLocalDataToCloud() {
        if (!this.auth.currentUser) {
            console.log('No user signed in, skipping migration');
            return;
        }

        try {
            this.updateSyncStatus('syncing');
            
            // Get local data
            const localTrips = localStorage.getItem('citizenship-trips');
            const localSettings = localStorage.getItem('citizenship-settings');
            
            if (localTrips || localSettings) {
                const userData = {
                    trips: localTrips ? JSON.parse(localTrips) : [],
                    settings: localSettings ? JSON.parse(localSettings) : {},
                    lastUpdated: this.serverTimestamp(),
                    createdAt: this.serverTimestamp()
                };

                // Check if cloud data already exists
                const userDocRef = this.doc(this.db, 'users', this.auth.currentUser.uid);
                const userDoc = await this.getDoc(userDocRef);
                
                if (userDoc.exists()) {
                    // Cloud data exists, ask user what to do
                    const choice = await this.showDataConflictDialog();
                    
                    if (choice === 'cloud') {
                        // Load cloud data, overwrite local
                        await this.loadDataFromCloud();
                        return;
                    } else if (choice === 'local') {
                        // Upload local data, overwrite cloud
                        await this.setDoc(userDocRef, userData);
                    } else {
                        // Merge data
                        await this.mergeLocalAndCloudData(userDoc.data(), userData);
                        return;
                    }
                } else {
                    // No cloud data, upload local data
                    await this.setDoc(userDocRef, userData);
                }
                
                this.lastSyncTime = new Date();
                this.updateSyncStatus('synced');
                
                if (window.firebaseAuthManager) {
                    window.firebaseAuthManager.showSuccessMessage('Your data has been saved to the cloud!');
                }
            }
        } catch (error) {
            console.error('Migration error:', error);
            this.updateSyncStatus('error');
            
            if (window.firebaseAuthManager) {
                window.firebaseAuthManager.showErrorMessage('Failed to sync data to cloud. Please try again.');
            }
        }
    }

    // Load data from cloud
    async loadDataFromCloud() {
        if (!this.auth.currentUser) return;

        try {
            this.updateSyncStatus('syncing');
            
            const userDocRef = this.doc(this.db, 'users', this.auth.currentUser.uid);
            const userDoc = await this.getDoc(userDocRef);
            
            if (userDoc.exists()) {
                const cloudData = userDoc.data();
                
                // Update local storage with cloud data
                if (cloudData.trips) {
                    localStorage.setItem('citizenship-trips', JSON.stringify(cloudData.trips));
                }
                
                if (cloudData.settings) {
                    localStorage.setItem('citizenship-settings', JSON.stringify(cloudData.settings));
                }
                
                // Refresh the main app
                if (window.citizenshipTracker) {
                    window.citizenshipTracker.loadData();
                    window.citizenshipTracker.updateDashboard();
                    window.citizenshipTracker.renderTrips();
                }
                
                this.lastSyncTime = new Date();
                this.updateSyncStatus('synced');
            } else {
                // No cloud data found
                this.updateSyncStatus('synced');
            }
        } catch (error) {
            console.error('Load from cloud error:', error);
            this.updateSyncStatus('error');
        }
    }

    // Save data to cloud
    async saveDataToCloud(data) {
        if (!this.auth.currentUser) {
            // Queue for later if user signs in
            this.syncQueue.push({ action: 'save', data });
            return;
        }

        if (!this.isOnline) {
            // Queue for when online
            this.syncQueue.push({ action: 'save', data });
            this.updateSyncStatus('queued');
            return;
        }

        try {
            this.updateSyncStatus('syncing');
            
            const userDocRef = this.doc(this.db, 'users', this.auth.currentUser.uid);
            
            const updateData = {
                ...data,
                lastUpdated: this.serverTimestamp()
            };
            
            await this.updateDoc(userDocRef, updateData);
            
            this.lastSyncTime = new Date();
            this.updateSyncStatus('synced');
        } catch (error) {
            console.error('Save to cloud error:', error);
            this.updateSyncStatus('error');
            
            // Queue for retry
            this.syncQueue.push({ action: 'save', data });
        }
    }

    // Save trips to cloud
    async saveTripsToCloud(trips) {
        await this.saveDataToCloud({ trips });
    }

    // Save settings to cloud
    async saveSettingsToCloud(settings) {
        await this.saveDataToCloud({ settings });
    }

    // Process sync queue
    async processSyncQueue() {
        if (!this.isOnline || !this.auth.currentUser || this.syncQueue.length === 0) {
            return;
        }

        const queue = [...this.syncQueue];
        this.syncQueue = [];

        for (const item of queue) {
            try {
                if (item.action === 'save') {
                    await this.saveDataToCloud(item.data);
                }
            } catch (error) {
                console.error('Sync queue processing error:', error);
                // Re-queue failed items
                this.syncQueue.push(item);
            }
        }
    }

    // Data conflict resolution
    async showDataConflictDialog() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'block';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Data Conflict Detected</h3>
                    </div>
                    <div class="modal-body">
                        <p>You have data both locally and in the cloud. What would you like to do?</p>
                        <div class="conflict-options">
                            <button class="btn btn-primary" id="useCloudData">
                                <i class="fas fa-cloud-download-alt"></i> Use Cloud Data
                            </button>
                            <button class="btn btn-secondary" id="useLocalData">
                                <i class="fas fa-upload"></i> Use Local Data
                            </button>
                            <button class="btn btn-secondary" id="mergeData">
                                <i class="fas fa-code-branch"></i> Merge Both
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            document.body.style.overflow = 'hidden';

            document.getElementById('useCloudData').onclick = () => {
                document.body.removeChild(modal);
                document.body.style.overflow = 'auto';
                resolve('cloud');
            };

            document.getElementById('useLocalData').onclick = () => {
                document.body.removeChild(modal);
                document.body.style.overflow = 'auto';
                resolve('local');
            };

            document.getElementById('mergeData').onclick = () => {
                document.body.removeChild(modal);
                document.body.style.overflow = 'auto';
                resolve('merge');
            };
        });
    }

    // Merge local and cloud data
    async mergeLocalAndCloudData(cloudData, localData) {
        try {
            // Merge trips (avoid duplicates based on departure date + destination)
            const mergedTrips = [...(cloudData.trips || [])];
            const localTrips = localData.trips || [];
            
            localTrips.forEach(localTrip => {
                const exists = mergedTrips.some(cloudTrip => 
                    cloudTrip.departureDate === localTrip.departureDate &&
                    cloudTrip.destination === localTrip.destination
                );
                
                if (!exists) {
                    mergedTrips.push(localTrip);
                }
            });

            // Merge settings (local takes precedence for conflicts)
            const mergedSettings = {
                ...(cloudData.settings || {}),
                ...(localData.settings || {})
            };

            const mergedData = {
                trips: mergedTrips,
                settings: mergedSettings,
                lastUpdated: this.serverTimestamp()
            };

            // Save merged data to cloud
            const userDocRef = this.doc(this.db, 'users', this.auth.currentUser.uid);
            await this.setDoc(userDocRef, mergedData);

            // Update local storage
            localStorage.setItem('citizenship-trips', JSON.stringify(mergedTrips));
            localStorage.setItem('citizenship-settings', JSON.stringify(mergedSettings));

            // Refresh the main app
            if (window.citizenshipTracker) {
                window.citizenshipTracker.loadData();
                window.citizenshipTracker.updateDashboard();
                window.citizenshipTracker.renderTrips();
            }

            this.lastSyncTime = new Date();
            this.updateSyncStatus('synced');

            if (window.firebaseAuthManager) {
                window.firebaseAuthManager.showSuccessMessage('Data merged successfully!');
            }
        } catch (error) {
            console.error('Merge data error:', error);
            this.updateSyncStatus('error');
        }
    }

    // Clear cloud data reference
    clearCloudData() {
        this.lastSyncTime = null;
        this.syncQueue = [];
        this.updateSyncStatus('offline');
    }

    // Update sync status UI
    updateSyncStatus(status) {
        const syncStatus = document.getElementById('syncStatus');
        const syncText = document.getElementById('syncText');
        
        if (!syncStatus || !syncText) return;

        const statusConfig = {
            'synced': {
                icon: 'fas fa-cloud-upload-alt',
                text: 'Synced',
                class: 'sync-success'
            },
            'syncing': {
                icon: 'fas fa-sync fa-spin',
                text: 'Syncing...',
                class: 'sync-progress'
            },
            'queued': {
                icon: 'fas fa-clock',
                text: 'Queued',
                class: 'sync-queued'
            },
            'error': {
                icon: 'fas fa-exclamation-triangle',
                text: 'Error',
                class: 'sync-error'
            },
            'offline': {
                icon: 'fas fa-wifi-slash',
                text: 'Offline',
                class: 'sync-offline'
            },
            'online': {
                icon: 'fas fa-cloud-upload-alt',
                text: 'Online',
                class: 'sync-success'
            }
        };

        const config = statusConfig[status] || statusConfig['offline'];
        
        syncStatus.className = `sync-status ${config.class}`;
        syncStatus.querySelector('i').className = config.icon;
        syncText.textContent = config.text;
    }

    // Public methods for the main app to use
    async syncTrips(trips) {
        if (this.auth.currentUser) {
            await this.saveTripsToCloud(trips);
        }
    }

    async syncSettings(settings) {
        if (this.auth.currentUser) {
            await this.saveSettingsToCloud(settings);
        }
    }

    // Get public data for sharing
    async getPublicData(userId) {
        try {
            const userDocRef = this.doc(this.db, 'users', userId);
            const userDoc = await this.getDoc(userDocRef);
            
            if (!userDoc.exists()) {
                return null;
            }

            const data = userDoc.data();
            
            // Return only public-safe data
            return {
                stats: this.calculatePublicStats(data.trips || [], data.settings || {}),
                lastUpdated: data.lastUpdated
            };
        } catch (error) {
            console.error('Get public data error:', error);
            return null;
        }
    }

    // Calculate public stats (no personal details)
    calculatePublicStats(trips, settings) {
        // Use the same calculation logic as the main app
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
            progressPercentage: Math.round(progressPercentage),
            daysRemaining,
            totalTrips,
            isPRDateSet: !!prDate
        };
    }
}

// Initialize Firebase Sync Manager
window.firebaseSync = new FirebaseSyncManager();