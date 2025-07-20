import { NextRequest } from 'next/server'
import { isValidSignature, SIGNATURE_HEADER_NAME } from '@sanity/webhook'

// Helper function to handle webhook signature verification with Cloudflare context
export async function handleWebhookSignature(request: NextRequest, getSecret: () => Promise<string>) {
  try {
    const secret = await getSecret()

    const bodyText = await request.text()

    if (secret) {
      const signature = request.headers.get(SIGNATURE_HEADER_NAME)
      
      if (!signature) {
        console.error('No webhook signature header found')
        return { success: false, error: 'Invalid signature', status: 401, bodyText: null }
      }

      const isValid = await isValidSignature(bodyText, signature, secret)
      
      if (!isValid) {
        console.error('Invalid webhook signature')
        return { success: false, error: 'Invalid signature', status: 401, bodyText: null }
      }
    } else {
      console.warn('No webhook secret configured, skipping signature verification')
    }

    return { success: true, bodyText }
  } catch (error) {
    console.error('Signature verification error:', error)
    return { success: false, error: 'Signature verification failed', status: 500, bodyText: null }
  }
} 