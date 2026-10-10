const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { packageName, friendsCode, order } = req.body;

    const packages = {
      "Solo Scene": { name: "Solo Scene", price: 5000 },
      "Dynamic Duo": { name: "Dynamic Duo", price: 8000 },
      "Date Night Bucket": { name: "Date Night Bucket", price: 8000 },
      "Blockbuster Bundle": { name: "Blockbuster Bundle", price: 12000 },
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

    const shippingOptions = [{
      shipping_rate_data: {
        type: "fixed_amount",
        fixed_amount: {
          amount: isFriendsOrder ? 0 : 1299,
          currency: "usd",
        },
        display_name: isFriendsOrder
          ? "Family & Friends Local Pickup - FREE"
          : "Flat Rate Shipping",
      },
    }];

    const metadata = {
      package: selected.name,
      fulfillment: isFriendsOrder ? "Local pickup" : "Shipping",
      selections_received: order ? "yes" : "no",
      packing_version: "1",
    };

    if (order) {
      const limits = {
        snacks: 48,
        drinks: 4,
        shirts: 4,
        popcorns: 2,
      };

      for (const [field, limit] of Object.entries(limits)) {
        const items = order[field] || [];

        if (
          !Array.isArray(items) ||
          items.length > limit ||
          items.some(item =>
            typeof item !== "string" || item.length > 80
          )
        ) {
          return res.status(400).json({
            error: "Invalid order selections",
          });
        }

        if (field === "snacks") {
          for (let i = 0; i < items.length; i += 5) {
            const key =
              "snacks_" + String(i / 5 + 1).padStart(2, "0");

            metadata[key] = JSON.stringify(items.slice(i, i + 5));
          }

          metadata.snack_count = String(items.length);
        } else {
          metadata[field] = JSON.stringify(items);
        }
      }

      for (const field of ["theme", "bubbly"]) {
        if (order[field] !== undefined) {
          if (
            typeof order[field] !== "string" ||
            order[field].length > 80
          ) {
            return res.status(400).json({
              error: "Invalid order selections",
            });
          }

          metadata[field] = order[field];
        }
      }
    }

    const people = {
      "Solo Scene": 1,
      "Dynamic Duo": 2,
      "Date Night Bucket": 2,
      "Blockbuster Bundle": 4,
    }[selected.name];

    metadata.candy_cups = String(people);

    if (selected.name === "Date Night Bucket") {
      metadata.included =
        "2 wine glasses; His & Hers trivia card set; " +
        "2 keepsake tickets; LED candle and rose petals";
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      metadata,
      payment_intent_data: { metadata },

      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: selected.name },
          unit_amount: selected.price,
        },
        quantity: 1,
      }],

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
