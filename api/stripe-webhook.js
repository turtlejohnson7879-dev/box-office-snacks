const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const event = req.body;

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
    console.error("Webhook error:", error);
    return res.status(400).json({ error: "Webhook error" });
  }
};