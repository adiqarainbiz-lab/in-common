-- Sample businesses
INSERT INTO businesses (name, category, address, description, points_rate) VALUES
  ('Al-Quds Bakery',    'food',     'Old City, Jerusalem',       'Traditional Palestinian breads and sweets baked fresh daily.',     10),
  ('Zaytoun Kitchen',   'food',     'Muslim Quarter, Jerusalem',  'Home-style Palestinian cooking. Musakhan, maqluba, and more.',    10),
  ('Handal Bookshop',   'shop',     'Al-Rashidiyya, Jerusalem',   'Books, maps, and stationery. Serving Jerusalem since 1972.',       10),
  ('Embroidery House',  'shop',     'Christian Quarter',          'Authentic tatreez embroidery, keffiyehs, and handcraft gifts.',   10),
  ('Cedar Barbershop',  'services', 'Bab al-Amud St, Jerusalem',  'Grooming and haircuts. Family-run for three generations.',        10),
  ('Olive Press Spa',   'services', 'Silwan, Jerusalem',          'Traditional hammam and olive-oil skin treatments.',               10);

-- Sample admin staff (password: admin123)
-- In production replace with a proper setup script
INSERT INTO staff (business_id, name, phone_number, password_hash, role)
SELECT
  id,
  'Manager Account',
  '+972501000001',
  '$2a$12$2UvK7OLw.ldRMv2tsfSsn.tztwGr6LU78sBX22kRaC6/G5H6rxzcm', -- admin123
  'manager'
FROM businesses WHERE name = 'Al-Quds Bakery';
