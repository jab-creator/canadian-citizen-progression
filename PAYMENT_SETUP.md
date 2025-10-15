# Payment System Setup Guide 💳

This guide explains how to set up the premium payment system for the Canadian Citizenship Tracker, making cloud sync and sharing features paid.

## 🎯 What's Changed

### Previously Free Features (Now Premium)
- ☁️ **Cloud Sync**: Automatic data synchronization across devices
- 🔗 **Progress Sharing**: Generate shareable links to show citizenship progress
- 📊 **Advanced Analytics**: Detailed progress insights (future feature)
- 🎧 **Priority Support**: Email support with faster response times

### Still Free Features
- 📱 **Local Storage**: All core tracking functionality works offline
- 📊 **Basic Dashboard**: Progress tracking and countdown timers
- 📝 **Trip Management**: Add, edit, and delete travel history
- 📤 **Data Export/Import**: JSON backup and restore

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │  Payment Server │    │     Stripe      │
│                 │    │                 │    │                 │
│ ▸ PaymentManager│◄──►│ ▸ Express API   │◄──►│ ▸ Checkout      │
│ ▸ Upgrade Modal │    │ ▸ Webhook       │    │ ▸ Subscriptions │
│ ▸ Feature Gates │    │ ▸ User Storage  │    │ ▸ Webhooks      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 New Files Added

### Frontend Files
- `payment-manager.js` - Subscription status and payment processing
- `success.html` - Payment success page
- Updated `index.html` - Upgrade modal and premium UI
- Updated `styles.css` - Premium styling and modal design
- Updated `script.js` - Payment checks for cloud features

### Backend Files
- `payment-server.js` - Express server for Stripe integration
- `package.json` - Node.js dependencies

## 🚀 Setup Instructions

### 1. Stripe Account Setup

1. **Create Stripe Account**
   - Go to [stripe.com](https://stripe.com) and create an account
   - Complete account verification for live payments

2. **Get API Keys**
   - Go to Developers → API keys
   - Copy your **Publishable key** (starts with `pk_`)
   - Copy your **Secret key** (starts with `sk_`)

3. **Create Products and Prices**
   ```bash
   # Using Stripe CLI or Dashboard, create:
   # Monthly subscription: $4.99/month
   # Yearly subscription: $49.99/year
   ```

### 2. Configure Frontend

1. **Update Stripe Publishable Key**
   ```javascript
   // In payment-manager.js, line 84:
   this.paymentProvider = window.Stripe('pk_live_your_actual_publishable_key_here');
   ```

2. **Update Price IDs**
   ```javascript
   // In payment-manager.js, update getPricingInfo() method with your actual Stripe price IDs
   monthly: {
       priceId: 'price_1234567890abcdef', // Your actual monthly price ID
       // ...
   },
   yearly: {
       priceId: 'price_0987654321fedcba', // Your actual yearly price ID
       // ...
   }
   ```

### 3. Deploy Payment Server

#### Option A: Same Server (Recommended for small scale)

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Environment Variables**
   ```bash
   export STRIPE_SECRET_KEY="sk_live_your_secret_key_here"
   export STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret_here"
   export PORT=3001
   ```

3. **Start Payment Server**
   ```bash
   npm start
   ```

4. **Update Nginx Configuration**
   ```nginx
   # Add to your nginx.conf
   location /create-checkout-session {
       proxy_pass http://localhost:3001;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
   }
   
   location /payment-success {
       proxy_pass http://localhost:3001;
   }
   
   location /subscription-status {
       proxy_pass http://localhost:3001;
   }
   ```

#### Option B: Separate Server (Recommended for production)

1. **Deploy to Cloud Provider**
   - Heroku, Railway, DigitalOcean, etc.
   - Set environment variables in your hosting platform

2. **Update API URLs**
   ```javascript
   // In payment-manager.js, update API endpoints:
   const API_BASE = 'https://your-payment-server.herokuapp.com';
   ```

### 4. Configure Webhooks

1. **Create Webhook Endpoint**
   - Go to Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://yourdomain.com/webhook`
   - Select events:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`

2. **Get Webhook Secret**
   - Copy the webhook signing secret
   - Add to environment variables as `STRIPE_WEBHOOK_SECRET`

### 5. Update Firebase Security Rules

```javascript
// Add to your Firestore security rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Existing rules...
    
    // Subscription data - only user can read/write their own
    match /subscriptions/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Public shares - only premium users can create
    match /public_shares/{shareId} {
      allow read: if true; // Public reading
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/subscriptions/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/subscriptions/$(request.auth.uid)).data.status == 'premium';
    }
  }
}
```

## 💰 Pricing Strategy

### Current Pricing
- **Monthly**: $4.99/month
- **Yearly**: $49.99/year (17% savings)

### Value Proposition
- **Cloud Sync**: Access data from any device
- **Sharing**: Professional progress sharing
- **Backups**: Never lose your data
- **Support**: Priority email assistance

## 🧪 Testing

### Test Mode Setup
1. Use Stripe test keys (start with `pk_test_` and `sk_test_`)
2. Use test card numbers:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`

### Test Flow
1. Click "Upgrade to Premium" button
2. Select monthly or yearly plan
3. Complete checkout with test card
4. Verify redirect to success page
5. Confirm premium features are unlocked

## 🔒 Security Considerations

### Frontend Security
- Never store sensitive payment data in localStorage
- Validate subscription status on both client and server
- Use HTTPS for all payment-related requests

### Backend Security
- Validate webhook signatures
- Use environment variables for secrets
- Implement rate limiting on payment endpoints
- Log all payment-related activities

### Database Security
- Encrypt sensitive subscription data
- Implement proper access controls
- Regular security audits

## 📊 Monitoring & Analytics

### Key Metrics to Track
- **Conversion Rate**: Free to premium upgrades
- **Churn Rate**: Premium subscription cancellations
- **Revenue**: Monthly recurring revenue (MRR)
- **Feature Usage**: Which premium features are most used

### Recommended Tools
- Stripe Dashboard for payment analytics
- Google Analytics for user behavior
- Custom logging for feature usage

## 🚨 Troubleshooting

### Common Issues

1. **Payment Button Not Working**
   - Check Stripe publishable key is correct
   - Verify payment server is running
   - Check browser console for errors

2. **Webhook Not Receiving Events**
   - Verify webhook URL is accessible
   - Check webhook secret is correct
   - Review Stripe webhook logs

3. **Features Not Unlocking**
   - Check subscription status in database
   - Verify Firebase security rules
   - Clear browser cache and localStorage

### Support Checklist
- [ ] Stripe account is verified
- [ ] API keys are correct and active
- [ ] Webhook endpoint is configured
- [ ] Payment server is running
- [ ] Firebase rules allow premium features
- [ ] SSL certificate is valid

## 🔄 Migration from Free to Paid

### Existing Users
- All existing functionality remains free
- Cloud features require upgrade
- Graceful degradation for free users
- Clear upgrade prompts

### Data Migration
- Existing local data is preserved
- Premium users can sync existing data
- No data loss during transition

## 📈 Future Enhancements

### Planned Features
- **Team Accounts**: For immigration consultants
- **Advanced Analytics**: Detailed progress insights
- **Mobile App**: iOS and Android applications
- **API Access**: For third-party integrations

### Pricing Tiers
Consider adding more tiers:
- **Basic**: Current free features
- **Premium**: Current paid features ($4.99/month)
- **Professional**: Team features ($19.99/month)
- **Enterprise**: Custom pricing

## 📞 Support

### For Users
- Email: support@citizenshiptracker.ca
- FAQ: Available in app settings
- Response time: 24-48 hours (premium users get priority)

### For Developers
- Technical documentation in code comments
- Stripe documentation: [stripe.com/docs](https://stripe.com/docs)
- Firebase documentation: [firebase.google.com/docs](https://firebase.google.com/docs)

---

## ✅ Deployment Checklist

Before going live:

- [ ] Stripe account verified and live keys configured
- [ ] Payment server deployed and accessible
- [ ] Webhooks configured and tested
- [ ] Firebase security rules updated
- [ ] SSL certificates valid
- [ ] Test payments completed successfully
- [ ] Error handling tested
- [ ] Monitoring and logging configured
- [ ] Support processes established
- [ ] Legal pages updated (terms, privacy)

**🎉 Congratulations!** Your citizenship tracker now has a professional payment system that will generate recurring revenue while providing valuable premium features to your users.