import MapPage from '../../components/MapPage';

export default function ParisRoute() {
  return (
    <MapPage 
      initialCenter={[48.8566, 2.3522]} // Paris coordinates
      initialZoom={14}
      title="Paris Map View"
    />
  );
} 