const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { packageName, friendsCode } = req.body;

    const packages = {
      "Solo Scene": {
        name: "Solo Scene",
        price: 5000,
      },

      "Dynamic Duo": {
        name: "Dynamic Duo",
        price: 8000,
      },

      "Date Night Bucket": {
        name: "Date Night Bucket",
        price: 8000,
      },

      "Blockbuster Bundle": {
        name: "Blockbuster Bundle",
        price: 12000,
      },
    };

    const selected = packages[packageName];

    if (!selected) {
      return res.status(400).json({ error: "Invalid package" });
    }

const isFriendsOrder = Boolean(
  process.env.FRIENDS_PICKUP_CODE &&
  typeof friendsCode === "string" &&
  friendsCode === process.env.FRIENDS_PICKUP_CODE
);

    const shippingOptions = isFriendsOrder
      ? [
          {
            shipping_rate_data: {
              type: "fixed_amount",
              fixed_amount: {
                amount: 0,
                currency: "usd",
              },
              display_name: "Family & Friends Local Pickup - FREE",
            },
          },
        ]
      : [
          {
            shipping_rate_data: {
              type: "fixed_amount",
              fixed_amount: {
                amount: 1299,
                currency: "usd",
              },
              display_name: "Flat Rate Shipping",
            },
          },
        ];

    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: selected.name,
            },
            unit_amount: selected.price,
          },
          quantity: 1,
        },
      ],

      shipping_address_collection: {
        allowed_countries: ["US"],
      },

      shipping_options: shippingOptions,

      success_url: `${req.headers.origin}/?payment=success`,
      cancel_url: `${req.headers.origin}/?payment=cancelled`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Unable to create checkout session",
    });
  }
};
