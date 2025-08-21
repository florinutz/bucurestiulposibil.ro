-- Mark 21 specific pins as votable for the voting phase
-- Replace these IDs with your actual chosen pin IDs from the database
UPDATE geopoints SET is_votable = TRUE WHERE id IN (
  'U2gTStYh0IVwUEOJbCsIcP', -- Acces zona lac
  'U2gTStYh0IVwUEOJbCoE4a', -- Strand Cara  
  'nP5GIt0J2mhTNRaq5gi63M', -- Soseaua Fundeni - spitale IOB si Fundeni
  'nP5GIt0J2mhTNRaq5ghvjC', -- Reorganizare Cal. Grivitei si Bd. Bucurestii Noi
  'nP5GIt0J2mhTNRaq5ghgUC', -- Parc Universitatea Spiru Haret
  'oLHtOefD7nkFljdU8K22tW', -- Sens unic și lărgirea trotuarelor pe Drumul Jilavei
  'oLHtOefD7nkFljdU8K1Eyy', -- Statia de metrou 1 Decembrie 1918
  'nP5GIt0J2mhTNRaq5gfOYW', -- Gradinile Blocurilor de pe Bulevardul 1 Mai
  'oLHtOefD7nkFljdU8K0OUk', -- Splaiul unirii NU autostrada
  'U2gTStYh0IVwUEOJbCa3y5', -- Strada Lascar
  'oLHtOefD7nkFljdU8K0BG0', -- Poduri pe dambovita. - Splaiul Unirii
  'oLHtOefD7nkFljdU8K09bo', -- ȘOSEAUA DOBROEȘTI
  'U2gTStYh0IVwUEOJbCZzek', -- Strada Foisorului
  'U2gTStYh0IVwUEOJbCZyjA', -- Bulevardul Berceni
  'nP5GIt0J2mhTNRaq5gf7de', -- Mutarea statuii soldatului în mijlocul intersecției
  'oLHtOefD7nkFljdU8JzNrO', -- Biruintei
  'oLHtOefD7nkFljdU8JzGb6', -- Gradina Japoneza - Herastrau
  'U2gTStYh0IVwUEOJbCZ83W', -- Podul Ciurel
  'U2gTStYh0IVwUEOJbCZ5XE', -- Intersecție Virtuții - Petre Popovat - Constructorilor
  'nP5GIt0J2mhTNRaq5geupw', -- Piața Lahovary
  'oLHtOefD7nkFljdU8Jz2wo'  -- Piata Universitatii
);

-- Verify the update
SELECT COUNT(*) as votable_pins FROM geopoints WHERE is_votable = TRUE;

-- Show the selected pins
SELECT id, title, is_votable FROM geopoints WHERE is_votable = TRUE ORDER BY title;
