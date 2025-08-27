-- Mark 21 specific pins as votable for the voting phase
-- Replace these IDs with your actual chosen pin IDs from the database
-- First, set is_votable to FALSE for all pins
UPDATE geopoints SET is_votable = FALSE;

-- Clear existing votes before setting up new votable pins
TRUNCATE TABLE votes;

-- Then, mark the selected pins as votable
UPDATE geopoints SET is_votable = TRUE WHERE id IN (
    '76QQV0zlptBPiZCfYw5VzR', -- Piata Baneasa si Complex Romaero
    'U2gTStYh0IVwUEOJbBKlRO', -- Zambaccian colt cu Dorobanti
    'hAuuJ3dDLNuCTVH29fenOR', -- Parcul Vagonului
    'oLHtOefD7nkFljdU8Hldh4', -- Corbeni cu Armeneasca
    'oLHtOefD7nkFljdU8JsgHq', -- Intersectie Mecet cu Traian
    'U2gTStYh0IVwUEOJbDVyfJ', -- Străzi Rezidențiale (Lunca Bradului - TITAN)
    'oLHtOefD7nkFljdU8K0BG0', -- Poduri pe dambovita. - Splaiul Unirii
    'nP5GIt0J2mhTNRaq5gKpte', -- Cartier giurgiului
    'Qn7XvoKw9OlkLAmyumqtrz', -- Natiunile Unite
    'hAuuJ3dDLNuCTVH29er2YW', -- Intersecție Șoseaua Viilor - ctin Istrati
    'U2gTStYh0IVwUEOJbCZ5XE', -- Intersecție Virtuții - Petre Popovat - Constructorilor
    'M9DHw4PongwVZywLd5a6tP' -- Piața Giulești
);

-- Verify the update
SELECT COUNT(*) as votable_pins FROM geopoints WHERE is_votable = TRUE;

-- Show the selected pins
SELECT id, title, is_votable FROM geopoints WHERE is_votable = TRUE ORDER BY title;
