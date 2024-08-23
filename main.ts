#!/usr/bin/env -S npm run-script run

import Stripe from 'stripe';
import express from 'express';
import env from 'dotenv';
import {AddressInfo} from 'net';

env.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

const webhookSecret: string = "whsec_4gy4Bpt1yfddcqnGEiB2ysCHPvkwWkJb"

const app = express();

// Use JSON parser for all non-webhook routes
app.use(
  (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void => {
    if (req.originalUrl === '/api/v1/webhook') {
      next();
    } else {
      express.json()(req, res, next);
    }
  }
);


app.get('/', (req: express.Request, res: express.Response): void => {
  res.send('Hello, world!');
});

app.post(
  '/api/v1/webhook',
  // Stripe requires the raw body to construct the event
  express.raw({type: 'application/json'}),
  (req: express.Request, res: express.Response): void => {
    console.log("it hit here")
    const sig = req.headers['stripe-signature'];

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      // On error, log and return the error message
      console.log(`❌ Error message: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // Successfully constructed event
    console.log('✅ Success:', event.id);

    // Cast event data to Stripe object
    if (event.type === 'payment_intent.succeeded') {
      const stripeObject: Stripe.PaymentIntent = event.data
        .object as Stripe.PaymentIntent;
      console.log(`💰 PaymentIntent status: ${stripeObject.status}`);
    } else if (event.type === 'charge.succeeded') {
      const charge = event.data.object as Stripe.Charge;
      console.log(`💵 Charge id: ${charge.id}`);
    } else {
      console.warn(`🤷‍♀️ Unhandled event type: ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    res.json({received: true});
  }
);

const server = app.listen(3000);
console.log(
  `Webhook endpoint available at http://localhost:${
    (<AddressInfo>server.address()).port
  }/webhook`
);
