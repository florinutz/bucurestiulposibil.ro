'use client';

import dynamicImport from 'next/dynamic';

// Dynamically import ProposalMapPage with no SSR to avoid build issues
const ProposalMapPage = dynamicImport(() => import('../../components/proposal/ProposalMapPage'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
      <div className="text-white text-xl">Se încarcă harta...</div>
    </div>
  )
});

export default function ProposePage() {
  return (
    <ProposalMapPage 
      initialCenter={[44.4268, 26.1025]} // Bucharest coordinates
      initialZoom={13}
    />
  );
}
