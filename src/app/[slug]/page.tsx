// Re-export the root page component for slug routes
// This allows URLs like /giulesti, /obor, etc. to work
export { default } from '../page';

// Tell Next.js which slugs are valid to prevent catching all routes
export async function generateStaticParams() {
  // Dynamically read postcard image files from public/postcards directory
  // This ensures we only generate routes for locations that have images
  const fs = await import('fs');
  const path = await import('path');

  try {
    const postcardsDir = path.join(process.cwd(), 'public', 'postcards');
    const files = fs.readdirSync(postcardsDir);

    // Filter for .jpg files and extract slugs (remove .jpg extension)
    const slugs = files
      .filter(file => file.endsWith('.jpg'))
      .map(file => file.replace('.jpg', ''));

    return slugs.map((slug) => ({
      slug: slug,
    }));
  } catch (error) {
    console.error('Error reading postcards directory:', error);
    // Fallback to hardcoded list if reading fails
    return [
      'obor',
      'magheru',
      'opera',
      'unistrada',
      'sfstefan',
      'vladeasa',
      'uranus',
      'ateneu',
      'natiunileunite',
      'splai',
      'giulesti',
      'baneasa'
    ].map((slug) => ({ slug }));
  }
}
