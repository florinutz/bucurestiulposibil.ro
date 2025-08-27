// List of location IDs that have images available in public/locatii
// This is a lightweight static mapping to avoid filesystem access at runtime (edge-safe).

const IMAGE_BASE_PATH = "/locatii";

// Sourced from files present in public/locatii/*.jpg
const locationIdsWithImages = new Set<string>([
  "76QQV0zlptBPiZCfYw5VzR",
  "U2gTStYh0IVwUEOJbBKlRO",
  "hAuuJ3dDLNuCTVH29fenOR",
  "oLHtOefD7nkFljdU8Hldh4",
  "oLHtOefD7nkFljdU8JsgHq",
  "U2gTStYh0IVwUEOJbDVyfJ",
  "oLHtOefD7nkFljdU8K0BG0",
  "nP5GIt0J2mhTNRaq5gKpte",
  "Qn7XvoKw9OlkLAmyumqtrz",
  "hAuuJ3dDLNuCTVH29er2YW",
  "U2gTStYh0IVwUEOJbCZ5XE",
  "M9DHw4PongwVZywLd5a6tP",
]);

export function getLocationImageUrl(locationId: string): string | null {
  if (locationIdsWithImages.has(locationId)) {
    return `${IMAGE_BASE_PATH}/${locationId}.jpg`;
  }
  return null;
}

export function hasLocationImage(locationId: string): boolean {
  return locationIdsWithImages.has(locationId);
}


