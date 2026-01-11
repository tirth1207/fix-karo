# Razorpay Webhook Setup Guide

Since valid payments are only confirmed via Webhooks (server-to-server), your local "Pending" status will not update until Razorpay can talk to your localhost.

## 1. Expose Localhost to Internet
Usage of a tunneling service like `ngrok` is required for local development.

```bash
# Example if using ngrok
ngrok http 3000
```
*Copy the forwarding URL (e.g., `https://abcd-123.ngrok-free.app`)*

## 2. Configure Razorpay Dashboard
1. Go to **Razorpay Dashboard** > **Settings** > **Webhooks**.
2. Click **+ Add New Webhook**.
3. **Webhook URL**: `YOUR_NGROK_URL/api/webhooks/razorpay`
   - Example: `https://abcd-123.ngrok-free.app/api/webhooks/razorpay`
4. **Secret**: `my_secret_123`
   - *Choose a strong secret. You must restart your server after setting this in env.*
5. **Active Events**:
   - `payment.captured` (Critical)
   - `payment.failed`

## 3. Update Environment Variables
Add the secret to your `.env.local` file:

```bash
RAZORPAY_WEBHOOK_SECRET=my_secret_123
```

## 4. Test
1. Restart your dev server (`npm run dev`).
2. Make a payment.
3. Check your terminal or ngrok logs to see the `POST /api/webhooks/razorpay` request coming in.
4. Refresh your dashboard to see "Confirmed" status.
