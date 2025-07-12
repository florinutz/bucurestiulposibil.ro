'use client';

import dynamic from 'next/dynamic';

// Dynamically import MapPage with no SSR to avoid build issues
const MapPage = dynamic(() => import('../components/MapPage'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
      <div className="text-white text-xl">Loading map...</div>
    </div>
  )
});

export default function Home() {
  return (
    <MapPage 
      initialCenter={[40.7128, -74.0060]} // New York coordinates
      initialZoom={12}
      title="Harta Chestiilor - Pinuri Interactive"
    />
  );
}