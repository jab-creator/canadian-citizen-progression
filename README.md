# Canadian Citizenship Tracker 🇨🇦

A beautiful, interactive web application to track your progress towards Canadian citizenship eligibility. Monitor your days in Canada, manage your travel history, and see a real-time countdown to your eligibility date!

## ✨ Features

### 📊 Dashboard
- **Real-time Statistics**: Track days in Canada, days remaining, progress percentage, and total trips
- **Progress Visualization**: Beautiful progress bar showing your journey to 1,095 days
- **Live Countdown**: Real-time countdown timer to your estimated eligibility date
- **Colorful Cards**: Eye-catching statistics cards with gradient backgrounds

### ✈️ Trip Management
- **Easy Trip Entry**: Add trips with departure date, return date, destination, and reason
- **Trip Categories**: Predefined reasons (vacation, business, family, medical, etc.) or custom reasons
- **Trip History**: View all your trips with duration calculations
- **Edit & Delete**: Modify or remove trips as needed
- **Smart Validation**: Ensures return dates are after departure dates

### ⚙️ Settings
- **Permanent Resident Date**: Set your PR date for accurate calculations
- **Target Application Date**: Optional field for planning purposes
- **Residency Status**: Track your current status (Permanent Resident, Temporary Resident, Protected Person)

### 💾 Data Management
- **Export Data**: Download your complete trip history and settings as JSON
- **Import Data**: Restore from previously exported files
- **Local Storage**: Automatic saving of all your data in your browser
- **Clear Data**: Option to reset everything (with confirmation prompts)

### ☁️ Cloud Storage & Sync (NEW!)
- **Save to Cloud**: Sign in with Google or passwordless email to backup your data
- **Cross-Device Sync**: Access your data from any device after signing in
- **Automatic Backup**: Your trips and settings are automatically saved to the cloud
- **Offline Support**: Works offline and syncs when you're back online
- **Data Migration**: Seamlessly migrate existing local data to the cloud

### 🔗 Sharing Features (NEW!)
- **Share Your Progress**: Generate shareable links to show your citizenship journey
- **Privacy-First**: Only progress stats are shared, not personal trip details
- **Public View**: Beautiful public page showing days in Canada, progress %, and trip count
- **Easy Sharing**: Copy link to clipboard and share with family, friends, or immigration consultants

## 🧮 Calculation Logic

The application implements the official Canadian citizenship requirements:

- **1,095 Days Required**: Must be physically present in Canada for at least 1,095 days (3 years)
- **5-Year Eligibility Period**: Calculated from your application date backwards
- **730 Days as PR**: Must include at least 730 days as a permanent resident
- **Trip Overlap Handling**: Accurately calculates days outside Canada during the eligibility period
- **Smart Date Calculations**: Handles edge cases and overlapping periods correctly

## 🚀 Getting Started

### Option 1: Visit the Live Site
Visit **[https://citizenshiptracker.ca](https://citizenshiptracker.ca)** to start tracking your citizenship journey immediately!

### Option 2: Simple File Opening
1. Download all files (`index.html`, `styles.css`, `script.js`)
2. Open `index.html` in any modern web browser
3. Start tracking your citizenship journey!

### Option 3: Local Web Server
```bash
# Using Python (recommended)
python -m http.server 8000

# Using Node.js
npx http-server

# Using PHP
php -S localhost:8000
```

Then visit `http://localhost:8000` in your browser.

### Option 4: Cloud-Enabled Setup (Recommended)
To enable cloud storage and sharing features:

1. **Set up Firebase** (see [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for detailed instructions)
2. **Configure your Firebase project** with Authentication and Firestore
3. **Update the Firebase configuration** in `index.html` and `share.html`
4. **Deploy to Firebase Hosting** (optional) for custom sharing URLs

**Cost**: Free tier supports thousands of users. Paid tier starts at ~$1/month.

### Option 5: Docker Deployment
```bash
# Simple single container
docker build -t citizenship-tracker .
docker run -p 8000:8000 citizenship-tracker

# Full production setup with HTTPS
docker-compose -f docker-compose.prod.yml up -d
```

## 📱 How to Use

### 1. Initial Setup
1. Go to the **Settings** tab
2. Enter your **Permanent Resident Date**
3. Optionally set a **Target Application Date**
4. Save your settings

### 2. Adding Trips
1. Click the **Trips** tab
2. Click **"Add Trip"**
3. Fill in:
   - Departure date
   - Return date
   - Destination
   - Reason for travel
4. Save the trip

### 3. Monitor Progress
- The **Dashboard** automatically updates with your current status
- Watch the countdown timer tick down to your eligibility date
- Track your progress with the visual progress bar

### 4. Data Backup
- Use **Export Data** to download your information
- Keep backups of your trip history
- Use **Import Data** to restore from backups

## 🎨 Design Features

- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Modern UI**: Clean, professional interface with gradient backgrounds
- **Smooth Animations**: Hover effects and transitions for better user experience
- **Accessible**: Proper contrast ratios and keyboard navigation support
- **Font Awesome Icons**: Beautiful icons throughout the interface

## 🔒 Privacy & Security

- **Privacy-First Design**: Personal trip details are never shared publicly
- **Secure Authentication**: Google Sign-In and passwordless email authentication
- **Encrypted Cloud Storage**: Data is securely stored in Firebase with user-specific access controls
- **Offline-First**: Works completely offline, syncs when online
- **Export Control**: You control your data with export/import features
- **No Tracking**: No analytics or tracking of personal information

## 🌟 Technical Details

- **Pure HTML/CSS/JavaScript**: No frameworks or dependencies (except Firebase SDK)
- **Modern Browser Support**: Works in all modern browsers
- **Firebase Integration**: Cloud storage, authentication, and real-time sync
- **Offline-First Architecture**: Works without internet, syncs when available
- **Responsive CSS Grid**: Flexible layout system
- **ES6+ JavaScript**: Modern JavaScript features with modules

## 📋 Requirements Compliance

This application helps you track compliance with official Canadian citizenship requirements:

> "You must have been physically in Canada for at least 1,095 days (3 years) during your 5-year eligibility period."

The app automatically:
- Calculates your 5-year eligibility period
- Tracks days outside Canada from your trip records
- Ensures at least 730 days as a permanent resident
- Provides accurate countdown to eligibility

## 🤝 Contributing

This is an open-source project! Feel free to:
- Report bugs or issues
- Suggest new features
- Submit pull requests
- Share with other Canadian PR holders

## ⚠️ Disclaimer

This application is for tracking purposes only. Always verify your eligibility with official Government of Canada resources before applying for citizenship. The calculations provided are estimates based on the information you enter.

## 📞 Support

For questions about Canadian citizenship requirements, visit:
- [Government of Canada - Citizenship](https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-citizenship.html)
- [Physical Presence Calculator](https://eservices.cic.gc.ca/rescalc/resCalcStartNew.do)

---

**Made with ❤️ for aspiring Canadian citizens**
