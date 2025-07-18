import { NextRequest } from 'next/server'

// Helper function to verify Sanity webhook signature
export async function verifySanitySignature(request: NextRequest, secret: string): Promise<boolean> {
  const signature = request.headers.get('sanity-webhook-signature')
  if (!signature) {
    console.warn('No signature header found')
    return false
  }

  try {
    // Clone the request to read the body as text
    const clonedRequest = request.clone()
    const bodyText = await clonedRequest.text()
    
    // Log the full request details for debugging
    console.log('=== Webhook Signature Verification Debug ===')
    console.log('Request URL:', request.url)
    console.log('Request method:', request.method)
    console.log('Headers:', Object.fromEntries(request.headers.entries()))
    console.log('Body text:', bodyText)
    console.log('Received signature:', signature)
    console.log('Secret (first 8 chars):', secret.substring(0, 8) + '...')
    
    // Create HMAC-SHA256 signature
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const messageData = encoder.encode(bodyText)
    
    // Import the key
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    // Sign the message
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData)
    
    // Convert to hex string
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    console.log('Expected signature:', expectedSignature)
    console.log('Signatures match:', signature === expectedSignature)
    console.log('=== End Debug ===')
    
    // Compare signatures (constant-time comparison)
    if (signature.length !== expectedSignature.length) {
      return false
    }
    
    let result = 0
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i)
    }
    
    return result === 0
  } catch (error) {
    console.error('Error verifying signature:', error)
    return false
  }
}

// Helper function to handle webhook signature verification with Cloudflare context
export async function handleWebhookSignature(request: NextRequest, getSecret: () => Promise<string>) {
  try {
    const secret = await getSecret()

    // Verify webhook signature if secret is configured
    if (secret) {
      const isValidSignature = await verifySanitySignature(request, secret)
      if (!isValidSignature) {
        console.error('Invalid webhook signature')
        return { success: false, error: 'Invalid signature', status: 401 }
      }
      console.log('Webhook signature verified successfully')
    } else {
      console.warn('No webhook secret configured, skipping signature verification')
    }

    return { success: true }
  } catch (error) {
    console.error('Signature verification error:', error)
    return { success: false, error: 'Signature verification failed', status: 500 }
  }
} 