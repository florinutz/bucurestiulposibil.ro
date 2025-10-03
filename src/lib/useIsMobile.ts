import { useState, useEffect } from 'react';
import { isMobile, isTablet } from 'react-device-detect';

export function useIsMobile(): boolean {
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      // react-device-detect provides more accurate detection
      // isMobile detects phones, isTablet detects tablets
      // We consider both mobile and tablet as "mobile" for this use case
      const mobile = isMobile || isTablet;
      setIsMobileDevice(mobile);
    };

    // Check on mount
    checkIsMobile();

    // Listen for resize events to handle orientation changes
    // Note: react-device-detect doesn't provide a resize listener,
    // but we can still listen for orientation changes
    const handleResize = () => {
      // Re-check on resize for better accuracy
      checkIsMobile();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return isMobileDevice;
}
