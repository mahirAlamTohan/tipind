# tipind

A searchable medicine catalog and order form for your customers.

**Live:** https://tipind.mahiralamtohan.workers.dev

---

## What tipind is

tipind is a simple website where your customers can browse your medicine catalog, add items to a cart, and send you an order request — all without creating an account or paying online.

It is a **catalog, not a shop**. Your customers look up products by name, ingredient, manufacturer, or pack size, check prices, build a cart, and then send you a pre-filled order message by email or Telegram. Your team confirms availability, shipping, and payment directly with the customer.

## What your customers can do

| Task | How it works |
|------|--------------|
| **Search the catalog** | Search by product name, active ingredient, manufacturer, or pack size. Results update as you type. |
| **Filter results** | Filter by manufacturer, packaging type, or price range. Click once to include, twice to exclude, three times to clear. |
| **Build a cart** | Add packets to a cart with quantities. The cart is saved on the customer's device so it survives page reloads. |
| **See prices** | Every product shows its price per packet. Items without a usable price show as "quote required." |
| **Send an order** | Fill in delivery details (name, address, country, email, payment preference), then copy a pre-formatted order message to send by email or Telegram. |
| **Read your policies** | Shipping regions, payment methods, FAQs, and contact details are all on the site. |

## What tipind is not

- **Not an online shop.** No payment is taken on the website. Your team confirms prices, VAT, and cargo before anything is charged.
- **Not an account system.** Customers don't create accounts. Their delivery details are saved only on their own device, not on a server.
- **Not a backend application.** There is no server, no database, and no API. The site is a set of static files served through a global content delivery network.

## How to update prices and products

Your product data lives in a Google Sheet. When you need to update prices or add products:

1. Update the Google Sheet (add/edit products, prices, manufacturers, packaging).
2. Run `npm run catalog:build` — this downloads the sheet, validates it, and creates a new catalog file.
3. Commit the new catalog file and run `npm run deploy` to publish it.

The catalog is rebuilt as a single masked file (~200 KB) that your customers' browsers download once. Old catalog files are replaced, so customers always see the current prices.

If you prefer, you can also provide a JSON file and run:

```
node scripts/build-catalog.mjs -i ./source.json --clean --write-env
```

## How orders reach your team

When a customer finishes checkout, they see a dialog with:

1. **A pre-formatted order message** — items, quantities, delivery address, notes, email, and preferred payment method.
2. **"Copy message"** button — copies the order text to the clipboard.
3. Your **email address** and **Telegram handle** — displayed in the dialog so the customer knows where to send it.
4. A safety warning about Telegram impersonator accounts, with a recommendation to use email for security.

Your team receives the order, confirms availability and shipping, and follows up with the customer directly. No payment is processed on the site.

## Contact

The site displays your configured contact details:

- **Phone:** shown in the header and contact section (clickable on mobile)
- **WhatsApp:** linked via wa.me
- **Email:** linked via mailto
- **Telegram:** linked via t.me
- **Support hours:** shown on the contact page

These are configured at build time through environment variables. To change them, update `.env.production` and redeploy.

## Common questions

**"Can customers pay online?"**
No. The site does not process payments. Your team confirms pricing and shipping directly with each customer.

**"Is customer data stored on a server?"**
No. The site is static — there is no server or database. Delivery details are saved only on the customer's own device (browser localStorage) and are cleared when they finish an order.

**"How often should I update the catalog?"**
Whenever prices or products change. The build process validates the data and creates a new versioned file, so old prices are never shown after an update.

**"What countries do you ship to?"**
The shipping countries are configured in `.env.production` as `NEXT_PUBLIC_DELIVERY_COUNTRIES`. The checkout form, FAQ, and footer all derive from this single list.

**"Can I change the contact email or phone?"**
Yes. Update `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_CONTACT_PHONE`, `NEXT_PUBLIC_WHATSAPP_NUMBER`, or `NEXT_PUBLIC_TELEGRAM_USERNAME` in `.env.production` and redeploy.

---

## For developers

Technical documentation (architecture, deployment, code organization, security) is in [`docs/`](./docs/). If you are setting up the development environment, modifying code, or deploying changes, start with [`docs/README.md`](./docs/README.md).