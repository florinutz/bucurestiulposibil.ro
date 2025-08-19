import type { BrowserFingerprint } from '@/types/geopoint';

/**
 * Generate a browser fingerprint for voting fraud prevention.
 * This creates a semi-unique identifier based on browser characteristics.
 */
export function generateBrowserFingerprint(): BrowserFingerprint {
  if (typeof window === 'undefined') {
    // Server-side fallback
    return {
      userAgent: 'unknown',
      screenResolution: 'unknown',
      timezone: 'unknown',
      language: 'unknown',
      platform: 'unknown'
    };
  }

  return {
    userAgent: navigator.userAgent,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform
  };
}

/**
 * Generate a consistent hash from a browser fingerprint.
 * This is used as the primary identifier for vote deduplication.
 */
export function getFingerprintHash(fingerprint: BrowserFingerprint): string {
  const fingerprintString = JSON.stringify(fingerprint);
  return btoa(fingerprintString)
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 32);
}

/**
 * Check if two fingerprints are considered the same user.
 * Currently uses exact matching, but could be extended for fuzzy matching.
 */
export function areFingerprintsEqual(fp1: BrowserFingerprint, fp2: BrowserFingerprint): boolean {
  return getFingerprintHash(fp1) === getFingerprintHash(fp2);
}
