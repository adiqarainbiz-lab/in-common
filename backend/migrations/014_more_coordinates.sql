-- Coordinates for Jerusalem businesses added in 007_jerusalem_businesses.sql
-- (Migration 013 ran before these were added)
UPDATE businesses SET lat = 31.7793, lng = 35.2143 WHERE name = 'Cafe Bastet'               AND lat IS NULL;
UPDATE businesses SET lat = 31.7854, lng = 35.2370 WHERE name = 'Jeries Barbershop & Studio' AND lat IS NULL;
UPDATE businesses SET lat = 31.7791, lng = 35.2168 WHERE name = 'Yanai Bar'                 AND lat IS NULL;
UPDATE businesses SET lat = 31.7863, lng = 35.2374 WHERE name = 'Sarwa Street Kitchen'      AND lat IS NULL;
UPDATE businesses SET lat = 31.7984, lng = 35.2249 WHERE name = 'Askadinya'                 AND lat IS NULL;
UPDATE businesses SET lat = 31.7796, lng = 35.2318 WHERE name = 'Abu Shukri'                AND lat IS NULL;

-- Also patch seed businesses in case they were missed
UPDATE businesses SET lat = 31.7767, lng = 35.2345 WHERE name = 'Al-Quds Bakery'   AND lat IS NULL;
UPDATE businesses SET lat = 31.7787, lng = 35.2330 WHERE name = 'Zaytoun Kitchen'  AND lat IS NULL;
UPDATE businesses SET lat = 31.7990, lng = 35.2285 WHERE name = 'Handal Bookshop'  AND lat IS NULL;
UPDATE businesses SET lat = 31.7784, lng = 35.2295 WHERE name = 'Embroidery House' AND lat IS NULL;
UPDATE businesses SET lat = 31.7833, lng = 35.2283 WHERE name = 'Cedar Barbershop' AND lat IS NULL;
UPDATE businesses SET lat = 31.7669, lng = 35.2396 WHERE name = 'Olive Press Spa'  AND lat IS NULL;
