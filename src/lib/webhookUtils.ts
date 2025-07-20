import { NextRequest } from 'next/server'
import { isValidSignature, SIGNATURE_HEADER_NAME } from '@sanity/webhook'

// Helper function to handle webhook signature verification with Cloudflare context
export async function handleWebhookSignature(request: NextRequest, getSecret: () => Promise<string>) {
  try {
    const secret = await getSecret()

    // Verify webhook signature if secret is configured
    if (secret) {
      // Get the signature from the request header
      const signature = request.headers.get(SIGNATURE_HEADER_NAME)
      
      if (!signature) {
        console.error('No webhook signature header found')
        return { success: false, error: 'Invalid signature', status: 401 }
      }

      // Get the raw request body for signature verification
      const clonedRequest = request.clone()
      const bodyText = await clonedRequest.text()

      // Use the official Sanity webhook toolkit for verification
      const isValid = await isValidSignature(bodyText, signature, secret)
      
      if (!isValid) {
        console.error('Invalid webhook signature')
        return { success: false, error: 'Invalid signature', status: 401 }
      }
    } else {
      console.warn('No webhook secret configured, skipping signature verification')
    }

    return { success: true }
  } catch (error) {
    console.error('Signature verification error:', error)
    return { success: false, error: 'Signature verification failed', status: 500 }
  }
} 