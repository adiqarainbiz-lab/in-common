ALTER TABLE businesses ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- Add cover photos to existing seed businesses
UPDATE businesses SET cover_url = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80'
  WHERE name = 'Al-Quds Bakery';
UPDATE businesses SET cover_url = 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&q=80'
  WHERE name = 'Zaytoun Kitchen';
UPDATE businesses SET cover_url = 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80'
  WHERE name = 'Handal Bookshop';
UPDATE businesses SET cover_url = 'https://images.unsplash.com/photo-1558171813-3ab7e1ce8c54?w=800&q=80'
  WHERE name = 'Embroidery House';
UPDATE businesses SET cover_url = 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80'
  WHERE name = 'Cedar Barbershop';
UPDATE businesses SET cover_url = 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80'
  WHERE name = 'Olive Press Spa';
