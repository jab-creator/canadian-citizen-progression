// Simple Node.js server for handling Stripe payments
// This is a basic implementation - you'll need to customize it for your needs

const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files

// Store for user subscriptions (in production, use a proper database)
const userSubscriptions = new Map();

// Pricing configuration
const PRICING = {
    price_premium_monthly: {
        priceId: 'price_premium_monthly',
        amount: 499, // $4.99 in cents
        currency: 'usd',
        interval: 'month',
        name: 'Premium Monthly'
    },
    price_premium_yearly: {
        priceId: 'price_premium_yearly',
        amount: 4999, // $49.99 in cents
        currency: 'usd',
        interval: 'year',
        name: 'Premium Yearly'
    }
};

// Create checkout session
app.post('/create-checkout-session', async (req, res) => {
    try {
        const { priceId, userId } = req.body;
        
        if (!priceId || !userId) {
            return res.status(400).json({ error: 'Missing priceId or userId' });
        }

        const pricing = PRICING[priceId];
        if (!pricing) {
            return res.status(400).json({ error: 'Invalid price ID' });
        }

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: pricing.currency,
                        product_data: {
                            name: 'Canadian Citizenship Tracker Premium',
                            description: pricing.name,
                        },
                        unit_amount: pricing.amount,
                        recurring: {
                            interval: pricing.interval,
                        },
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${req.headers.origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin}/`,
            client_reference_id: userId,
            metadata: {
                userId: userId,
                priceId: priceId
            }
        });

        res.json({ id: session.id });
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// Handle successful payment
app.post('/payment-success', async (req, res) => {
    try {
        const { sessionId } = req.body;
        
        // Retrieve the checkout session
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        
        if (session.payment_status === 'paid') {
            const userId = session.client_reference_id;
            const subscription = await stripe.subscriptions.retrieve(session.subscription);
            
            // Calculate expiry date
            const expiryDate = new Date(subscription.current_period_end * 1000);
            
            // Store subscription info (in production, save to database)
            userSubscriptions.set(userId, {
                status: 'premium',
                stripeCustomerId: session.customer,
                stripeSubscriptionId: session.subscription,
                expiry: expiryDate,
                updatedAt: new Date()
            });
            
            res.json({
                success: true,
                subscription: {
                    status: 'premium',
                    expiry: expiryDate,
                    customerId: session.customer,
                    subscriptionId: session.subscription
                }
            });
        } else {
            res.status(400).json({ error: 'Payment not completed' });
        }
    } catch (error) {
        console.error('Error handling payment success:', error);
        res.status(500).json({ error: 'Failed to process payment success' });
    }
});

// Get subscription status
app.get('/subscription-status/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const subscription = userSubscriptions.get(userId);
        
        if (!subscription) {
            return res.json({ status: 'free' });
        }
        
        // Check if subscription is still valid
        if (subscription.expiry && new Date() > subscription.expiry) {
            subscription.status = 'expired';
            userSubscriptions.set(userId, subscription);
        }
        
        res.json({
            status: subscription.status,
            expiry: subscription.expiry,
            features: {
                cloudSync: subscription.status === 'premium',
                sharing: subscription.status === 'premium',
                advancedAnalytics: subscription.status === 'premium',
                prioritySupport: subscription.status === 'premium'
            }
        });
    } catch (error) {
        console.error('Error getting subscription status:', error);
        res.status(500).json({ error: 'Failed to get subscription status' });
    }
});

// Cancel subscription
app.post('/cancel-subscription', async (req, res) => {
    try {
        const { userId } = req.body;
        
        const subscription = userSubscriptions.get(userId);
        
        if (!subscription || !subscription.stripeSubscriptionId) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        
        // Cancel the subscription in Stripe
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
            cancel_at_period_end: true
        });
        
        // Update local status
        subscription.status = 'cancelled';
        subscription.updatedAt = new Date();
        userSubscriptions.set(userId, subscription);
        
        res.json({ success: true, message: 'Subscription cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
});

// Stripe webhook handler
app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
            const subscription = event.data.object;
            const userId = subscription.metadata?.userId;
            
            if (userId) {
                const status = subscription.status === 'active' ? 'premium' : 'expired';
                const expiryDate = new Date(subscription.current_period_end * 1000);
                
                userSubscriptions.set(userId, {
                    status: status,
                    stripeCustomerId: subscription.customer,
                    stripeSubscriptionId: subscription.id,
                    expiry: expiryDate,
                    updatedAt: new Date()
                });
            }
            break;
            
        case 'invoice.payment_failed':
            const invoice = event.data.object;
            const failedUserId = invoice.subscription_details?.metadata?.userId;
            
            if (failedUserId) {
                const userSub = userSubscriptions.get(failedUserId);
                if (userSub) {
                    userSub.status = 'payment_failed';
                    userSub.updatedAt = new Date();
                    userSubscriptions.set(failedUserId, userSub);
                }
            }
            break;
            
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({received: true});
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`Payment server running on port ${PORT}`);
    console.log(`Make sure to set the following environment variables:`);
    console.log(`- STRIPE_SECRET_KEY: Your Stripe secret key`);
    console.log(`- STRIPE_WEBHOOK_SECRET: Your Stripe webhook secret`);
});

module.exports = app;