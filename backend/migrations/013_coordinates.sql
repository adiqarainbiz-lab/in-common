-- Add lat/lng to businesses for map view
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS lat NUMERIC(10,7);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS lng NUMERIC(10,7);

-- Seed businesses (002_seed.sql)
UPDATE businesses SET lat = 31.7767, lng = 35.2345 WHERE name = 'Al-Quds Bakery';
UPDATE businesses SET lat = 31.7787, lng = 35.2330 WHERE name = 'Zaytoun Kitchen';
UPDATE businesses SET lat = 31.7990, lng = 35.2285 WHERE name = 'Handal Bookshop';
UPDATE businesses SET lat = 31.7784, lng = 35.2295 WHERE name = 'Embroidery House';
UPDATE businesses SET lat = 31.7833, lng = 35.2283 WHERE name = 'Cedar Barbershop';
UPDATE businesses SET lat = 31.7669, lng = 35.2396 WHERE name = 'Olive Press Spa';

-- Jerusalem businesses (007_jerusalem_businesses.sql)
UPDATE businesses SET lat = 31.7793, lng = 35.2143 WHERE name = 'Cafe Bastet';
UPDATE businesses SET lat = 31.7854, lng = 35.2370 WHERE name = 'Jeries Barbershop & Studio';
UPDATE businesses SET lat = 31.7791, lng = 35.2168 WHERE name = 'Yanai Bar';
UPDATE businesses SET lat = 31.7863, lng = 35.2374 WHERE name = 'Sarwa Street Kitchen';
UPDATE businesses SET lat = 31.7984, lng = 35.2249 WHERE name = 'Askadinya';
UPDATE businesses SET lat = 31.7796, lng = 35.2318 WHERE name = 'Abu Shukri';
