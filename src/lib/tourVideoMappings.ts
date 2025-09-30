import type { TourVideoMapping } from '@/types/geopoint';

/**
 * Mapping of pin IDs to YouTube video IDs for 360° tour videos
 * 
 * To add a new video:
 * 1. Get the pin ID from the database or Sanity
 * 2. Get the YouTube video ID (the part after 'v=' or 'embed/' in the URL)
 * 3. Add an entry below: 'pin-id': 'youtube-video-id'
 */
export const TOUR_VIDEO_MAPPINGS: TourVideoMapping = {
  // Example: '-YfwpCZXaaw' is the video ID from https://www.youtube.com/watch?v=-YfwpCZXaaw
  // Replace with your actual pin IDs and corresponding YouTube video IDs
  
  // Test mapping - Niro Voluntari location with 360° video
  '57dhSchUu5juggpLOl3Xor': '-YfwpCZXaaw',
  
  // Add more mappings here as needed
  // 'pin-id-2': 'another-video-id',
};

/**
 * Get the YouTube video ID for a given pin ID
 * @param pinId - The ID of the pin/location
 * @returns The YouTube video ID if mapped, undefined otherwise
 */
export function getYoutubeIdForPin(pinId: string): string | undefined {
  return TOUR_VIDEO_MAPPINGS[pinId];
}
