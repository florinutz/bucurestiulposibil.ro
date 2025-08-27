import type { BrowserFingerprint } from '@/types/geopoint';

/**
 * Generate a unique session identifier that persists across page reloads
 * but changes for different browser sessions/contexts.
 */
function generateSessionId(): string {
  // Try to get existing session ID from sessionStorage (not localStorage)
  if (typeof window !== 'undefined') {
    const existing = sessionStorage.getItem('voting-session-id');
    if (existing) {
      return existing;
    }
    
    // Generate new session ID
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
    sessionStorage.setItem('voting-session-id', sessionId);
    return sessionId;
  }
  
  // Server-side fallback
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
}

/**
 * Generate additional entropy for better uniqueness
 */
function generateAdditionalEntropy(): string {
  if (typeof window === 'undefined') {
    return 'unknown';
  }
  
  const entropy = [];
  
  // Hardware concurrency (CPU cores)
  if ('hardwareConcurrency' in navigator) {
    entropy.push(`cores:${navigator.hardwareConcurrency}`);
  }
  
  // Memory (if available)
  if ('deviceMemory' in navigator) {
    entropy.push(`mem:${(navigator as any).deviceMemory}`);
  }
  
  // Connection type (if available)
  if ('connection' in navigator) {
    const conn = (navigator as any).connection;
    if (conn && conn.effectiveType) {
      entropy.push(`conn:${conn.effectiveType}`);
    }
  }
  
  // Available screen space
  if (screen.availWidth && screen.availHeight) {
    entropy.push(`avail:${screen.availWidth}x${screen.availHeight}`);
  }
  
  // Color depth
  if (screen.colorDepth) {
    entropy.push(`color:${screen.colorDepth}`);
  }
  
  // Pixel depth
  if (screen.pixelDepth) {
    entropy.push(`pixel:${screen.pixelDepth}`);
  }
  
  return entropy.join('|');
}

/**
 * Generate a browser fingerprint for voting fraud prevention.
 * This creates a semi-unique identifier based on browser characteristics
 * and a unique session identifier for better deduplication.
 */
export function generateBrowserFingerprint(): BrowserFingerprint {
  if (typeof window === 'undefined') {
    // Server-side fallback
    return {
      userAgent: 'unknown',
      screenResolution: 'unknown',
      timezone: 'unknown',
      language: 'unknown',
      platform: 'unknown',
      sessionId: `sess_${Date.now()}_fallback`,
      additionalEntropy: 'unknown'
    };
  }

  return {
    userAgent: navigator.userAgent,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    sessionId: generateSessionId(),
    additionalEntropy: generateAdditionalEntropy()
  };
}

/**
 * Generate a consistent hash from a browser fingerprint.
 * This is used as the primary identifier for vote deduplication.
 * Uses a combination of session ID and other fingerprint data for better uniqueness.
 */
export function getFingerprintHash(fingerprint: BrowserFingerprint): string {
  // Create a hash that prioritizes the unique session ID at the beginning
  const uniqueParts = [
    fingerprint.sessionId,
    fingerprint.additionalEntropy,
    fingerprint.screenResolution,
    fingerprint.timezone,
    fingerprint.language,
    fingerprint.platform,
    fingerprint.userAgent.substring(0, 50) // Truncate userAgent since it's long and not unique
  ].join('|');
  
  // Create a more robust hash using multiple approaches
  const base64Hash = btoa(uniqueParts).replace(/[^a-zA-Z0-9]/g, '');
  
  // Also create a simple hash for additional entropy
  let simpleHash = 0;
  for (let i = 0; i < uniqueParts.length; i++) {
    const char = uniqueParts.charCodeAt(i);
    simpleHash = ((simpleHash << 5) - simpleHash) + char;
    simpleHash = simpleHash & simpleHash; // Convert to 32bit integer
  }
  
  // Combine both approaches and take first 32 characters
  const combinedHash = base64Hash + Math.abs(simpleHash).toString(36);
  return combinedHash.substring(0, 32);
}

/**
 * Check if two fingerprints are considered the same user.
 * Currently uses exact matching, but could be extended for fuzzy matching.
 */
export function areFingerprintsEqual(fp1: BrowserFingerprint, fp2: BrowserFingerprint): boolean {
  return getFingerprintHash(fp1) === getFingerprintHash(fp2);
}
