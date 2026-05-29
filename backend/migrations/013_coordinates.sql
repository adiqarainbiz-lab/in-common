-- Add lat/lng to businesses for map view
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS lat NUMERIC(10,7);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS lng NUMERIC(10,7);

-- Approximate coordinates for seed businesses in Jerusalem
UPDATE businesses SET lat = 31.7767, lng = 35.2345 WHERE name = 'Al-Quds Bakery';
UPDATE businesses SET lat = 31.7787, lng = 35.2330 WHERE name = 'Zaytoun Kitchen';
UPDATE businesses SET lat = 31.7990, lng = 35.2285 WHERE name = 'Handal Bookshop';
UPDATE businesses SET lat = 31.7784, lng = 35.2295 WHERE name = 'Embroidery House';
UPDATE businesses SET lat = 31.7833, lng = 35.2283 WHERE name = 'Cedar Barbershop';
UPDATE businesses SET lat = 31.7669, lng = 35.2396 WHERE name = 'Olive Press Spa';
