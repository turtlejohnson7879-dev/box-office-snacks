const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const signature = req.headers["stripe-signature"];

  try {
    let rawBody = "";

    for await (const chunk of req) {
      rawBody += chunk;
    }

    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      console.log("PAID ORDER:", {
        id: session.id,
        customer_email: session.customer_details?.email,
        amount_total: session.amount_total,
        payment_status: session.payment_status,
      });
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error.message);

    return res.status(400).json({
      error: "Webhook signature verification failed",
    });
  }
};