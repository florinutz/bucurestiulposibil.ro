import MapPage from '../components/MapPage';

export default function Home() {
  return (
    <MapPage 
      initialCenter={[40.7128, -74.0060]} // New York coordinates
      initialZoom={12}
      title="Welcome to Our Interactive Map"
    />
  );
}