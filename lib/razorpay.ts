import Razorpay from "razorpay"
import crypto from "crypto"

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error("Razorpay credentials missing")
}

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

export const verifyRazorpaySignature = (orderId: string, paymentId: string, signature: string) => {
  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${orderId}|${paymentId}`)
    .digest("hex")

  return generatedSignature === signature
}

export const verifyWebhookSignature = (body: string, signature: string, secret: string) => {
  const generatedSignature = crypto.createHmac("sha256", secret).update(body).digest("hex")

  return generatedSignature === signature
}
