-- ========== ENUMS ==========
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'user');
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled');
CREATE TYPE public.order_status AS ENUM ('pending', 'preparing', 'delivered', 'cancelled');

-- ========== HELPERS ==========
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ========== PROFILES ==========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== USER ROLES ==========
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon, service_role;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated USING (public.is_admin());

-- profiles policies (need is_admin defined first)
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ========== ROOMS ==========
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  room_type TEXT NOT NULL,
  short_description TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  price_per_night NUMERIC(10,2) NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 2,
  bed_type TEXT NOT NULL DEFAULT 'King Bed',
  size_sqm INTEGER NOT NULL DEFAULT 30,
  facilities TEXT[] NOT NULL DEFAULT '{}',
  images TEXT[] NOT NULL DEFAULT '{}',
  rating NUMERIC(2,1) NOT NULL DEFAULT 4.5,
  review_count INTEGER NOT NULL DEFAULT 0,
  total_rooms INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rooms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active rooms" ON public.rooms
  FOR SELECT TO anon, authenticated USING (is_active = true OR public.is_admin());
CREATE POLICY "Admins can insert rooms" ON public.rooms
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update rooms" ON public.rooms
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete rooms" ON public.rooms
  FOR DELETE TO authenticated USING (public.is_admin());
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== FOOD ==========
CREATE TABLE public.food_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.food_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_categories TO authenticated;
GRANT ALL ON public.food_categories TO service_role;
ALTER TABLE public.food_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view food categories" ON public.food_categories
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can manage food categories" ON public.food_categories
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.food_categories(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  is_veg BOOLEAN NOT NULL DEFAULT true,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  rating NUMERIC(2,1) NOT NULL DEFAULT 4.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.food_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_items TO authenticated;
GRANT ALL ON public.food_items TO service_role;
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view food items" ON public.food_items
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can insert food items" ON public.food_items
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update food items" ON public.food_items
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete food items" ON public.food_items
  FOR DELETE TO authenticated USING (public.is_admin());
CREATE TRIGGER update_food_items_updated_at BEFORE UPDATE ON public.food_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== COUPONS ==========
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  value NUMERIC(10,2) NOT NULL,
  min_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_discount NUMERIC(10,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active coupons" ON public.coupons
  FOR SELECT TO anon, authenticated USING (is_active = true OR public.is_admin());
CREATE POLICY "Admins can manage coupons" ON public.coupons
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ========== BOOKINGS ==========
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref TEXT NOT NULL UNIQUE DEFAULT ('GS-' || upper(substr(md5(random()::text), 1, 6))),
  user_id UUID NOT NULL,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  room_name TEXT NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INTEGER NOT NULL,
  guests INTEGER NOT NULL DEFAULT 2,
  rooms_count INTEGER NOT NULL DEFAULT 1,
  price_per_night NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  tax NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  coupon_code TEXT,
  status public.booking_status NOT NULL DEFAULT 'confirmed',
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  special_requests TEXT,
  payment_method TEXT NOT NULL DEFAULT 'pay_at_hotel',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own bookings" ON public.bookings
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Users can create own bookings" ON public.bookings
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own bookings" ON public.bookings
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX bookings_room_dates_idx ON public.bookings (room_id, check_in, check_out);
CREATE INDEX bookings_user_idx ON public.bookings (user_id);

-- Availability helper: dates in range where the room is fully booked
CREATE OR REPLACE FUNCTION public.get_room_unavailable_dates(_room_id UUID, _from DATE, _to DATE)
RETURNS SETOF DATE
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d::date
  FROM generate_series(_from, _to, interval '1 day') AS d
  WHERE (
    SELECT COALESCE(SUM(b.rooms_count), 0)
    FROM public.bookings b
    WHERE b.room_id = _room_id
      AND b.status IN ('pending', 'confirmed', 'checked_in')
      AND b.check_in <= d::date
      AND b.check_out > d::date
  ) >= (SELECT r.total_rooms FROM public.rooms r WHERE r.id = _room_id)
$$;
GRANT EXECUTE ON FUNCTION public.get_room_unavailable_dates(UUID, DATE, DATE) TO anon, authenticated, service_role;

-- Availability helper: how many rooms of this type are free for the whole stay
CREATE OR REPLACE FUNCTION public.get_rooms_available(_room_id UUID, _check_in DATE, _check_out DATE)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(0, (SELECT r.total_rooms FROM public.rooms r WHERE r.id = _room_id) - COALESCE((
    SELECT MAX(booked) FROM (
      SELECT (
        SELECT COALESCE(SUM(b.rooms_count), 0)
        FROM public.bookings b
        WHERE b.room_id = _room_id
          AND b.status IN ('pending', 'confirmed', 'checked_in')
          AND b.check_in <= d::date
          AND b.check_out > d::date
      ) AS booked
      FROM generate_series(_check_in, _check_out - 1, interval '1 day') AS d
    ) s
  ), 0))::integer
$$;
GRANT EXECUTE ON FUNCTION public.get_rooms_available(UUID, DATE, DATE) TO anon, authenticated, service_role;

-- ========== ORDERS ==========
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_ref TEXT NOT NULL UNIQUE DEFAULT ('OR-' || upper(substr(md5(random()::text), 1, 6))),
  user_id UUID NOT NULL,
  status public.order_status NOT NULL DEFAULT 'pending',
  subtotal NUMERIC(10,2) NOT NULL,
  tax NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  coupon_code TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  service_type TEXT NOT NULL DEFAULT 'room_service',
  room_number TEXT,
  scheduled_for TIMESTAMPTZ,
  notes TEXT,
  payment_method TEXT NOT NULL DEFAULT 'pay_at_hotel',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Users can create own orders" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own orders" ON public.orders
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX orders_user_idx ON public.orders (user_id);

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  food_item_id UUID REFERENCES public.food_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  image_url TEXT,
  unit_price NUMERIC(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own order items" ON public.order_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_admin()))
  );
CREATE POLICY "Users can add items to own orders" ON public.order_items
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );
CREATE INDEX order_items_order_idx ON public.order_items (order_id);

-- ========== SEED: ROOMS ==========
INSERT INTO public.rooms (slug, name, room_type, short_description, description, price_per_night, capacity, bed_type, size_sqm, facilities, images, rating, review_count, total_rooms, is_featured) VALUES
('deluxe-room', 'Deluxe Room', 'Deluxe', 'Elegant comfort with city views and a plush king bed.',
 'Our Deluxe Rooms blend contemporary elegance with warm, natural textures. Wake up to sweeping city views through floor-to-ceiling windows, sink into a signature GrandStay king bed with Egyptian cotton linens, and unwind in a marble bathroom with rain shower. Ideal for couples and business travellers who appreciate refined details.',
 6500, 2, 'King Bed', 32, ARRAY['Free Wi-Fi','Air Conditioning','55" Smart TV','Mini Bar','Tea & Coffee Maker','Rain Shower','In-room Safe','Daily Housekeeping'],
 ARRAY['/images/rooms/deluxe.jpg','/images/rooms/bathroom.jpg','/images/rooms/view.jpg'], 4.6, 214, 12, true),
('premium-room', 'Premium Room', 'Premium', 'Spacious luxury with a private balcony and pool views.',
 'The Premium Room offers generous space and a private furnished balcony overlooking the infinity pool and gardens. Enjoy a dedicated work desk, a walk-in wardrobe, and a deep soaking tub alongside a separate rain shower. Complimentary evening turndown service and premium bath amenities come standard.',
 8900, 2, 'King Bed', 40, ARRAY['Free Wi-Fi','Private Balcony','Pool View','65" Smart TV','Mini Bar','Nespresso Machine','Bathtub & Rain Shower','Bathrobe & Slippers','Evening Turndown'],
 ARRAY['/images/rooms/premium.jpg','/images/rooms/view.jpg','/images/rooms/bathroom.jpg'], 4.7, 168, 10, true),
('executive-suite', 'Executive Suite', 'Suite', 'A separate living room, club lounge access and butler service.',
 'Designed for discerning travellers, the Executive Suite features a separate living room with a dining nook, a luxurious bedroom and a marble bathroom with dual vanities. Guests enjoy exclusive access to the Executive Club Lounge with complimentary breakfast, afternoon tea and evening cocktails, plus personalised butler service throughout the stay.',
 14500, 3, 'King Bed + Sofa Bed', 62, ARRAY['Free Wi-Fi','Separate Living Room','Club Lounge Access','Butler Service','Complimentary Breakfast','Nespresso Machine','Bathtub & Rain Shower','Work Desk','Airport Transfer (one way)'],
 ARRAY['/images/rooms/executive.jpg','/images/rooms/lounge.jpg','/images/rooms/bathroom.jpg'], 4.8, 132, 6, true),
('family-room', 'Family Room', 'Family', 'Two queen beds, a kids corner and space for the whole family.',
 'Our Family Room is thoughtfully designed for families travelling together. Two plush queen beds, a cosy kids corner with games and books, a spacious bathroom with tub, and a small pantry make every stay effortless. Enjoy complimentary breakfast for two children under 12 and priority access to the kids club and pool.',
 11900, 4, '2 Queen Beds', 55, ARRAY['Free Wi-Fi','Two Queen Beds','Kids Corner','Mini Pantry','Bathtub','65" Smart TV','Board Games','Kids Club Access','Complimentary Kids Breakfast'],
 ARRAY['/images/rooms/family.jpg','/images/rooms/view.jpg','/images/rooms/bathroom.jpg'], 4.7, 96, 8, false),
('luxury-suite', 'Luxury Suite', 'Suite', 'Our finest residence with panoramic views and a private jacuzzi.',
 'The Luxury Suite is the crown of GrandStay. Spread across 95 square metres, it features a panoramic living room, a formal dining area for six, a master bedroom with super-king bed and a spa-style bathroom with a private jacuzzi. A dedicated butler, private check-in, chauffeured airport transfers and a curated in-suite bar complete an unforgettable experience.',
 24900, 4, 'Super King Bed', 95, ARRAY['Free Wi-Fi','Panoramic City View','Private Jacuzzi','Dining Area for 6','Dedicated Butler','Private Check-in','Chauffeured Airport Transfers','In-suite Bar','Club Lounge Access','Spa Credit'],
 ARRAY['/images/rooms/luxury.jpg','/images/rooms/lounge.jpg','/images/rooms/view.jpg'], 4.9, 74, 3, true);

-- ========== SEED: FOOD ==========
INSERT INTO public.food_categories (slug, name, sort_order) VALUES
('breakfast', 'Breakfast', 1),
('starters', 'Starters', 2),
('main-course', 'Main Course', 3),
('biriyani', 'Biriyani', 4),
('chinese', 'Chinese', 5),
('desserts', 'Desserts', 6),
('beverages', 'Beverages', 7);

INSERT INTO public.food_items (category_id, slug, name, description, price, image_url, is_veg, is_popular, rating) VALUES
((SELECT id FROM public.food_categories WHERE slug='breakfast'), 'masala-dosa', 'Masala Dosa', 'Crisp golden rice crêpe filled with spiced potato, served with coconut chutney and sambar.', 220, '/images/food/masala-dosa.jpg', true, true, 4.7),
((SELECT id FROM public.food_categories WHERE slug='breakfast'), 'continental-breakfast', 'Continental Breakfast', 'Fresh croissants, seasonal fruit, yoghurt, preserves and a choice of eggs any style.', 450, '/images/food/continental-breakfast.jpg', false, false, 4.5),
((SELECT id FROM public.food_categories WHERE slug='breakfast'), 'avocado-toast', 'Avocado Toast', 'Sourdough topped with smashed avocado, poached egg, chilli flakes and micro herbs.', 380, '/images/food/avocado-toast.jpg', true, false, 4.4),
((SELECT id FROM public.food_categories WHERE slug='starters'), 'paneer-tikka', 'Paneer Tikka', 'Char-grilled cottage cheese marinated in yoghurt and spices, served with mint chutney.', 340, '/images/food/paneer-tikka.jpg', true, true, 4.6),
((SELECT id FROM public.food_categories WHERE slug='starters'), 'chicken-malai-kebab', 'Chicken Malai Kebab', 'Creamy, melt-in-the-mouth chicken kebabs with cardamom, cheese and cream.', 420, '/images/food/chicken-malai-kebab.jpg', false, true, 4.8),
((SELECT id FROM public.food_categories WHERE slug='starters'), 'crispy-corn', 'Crispy Corn', 'Golden fried sweet corn tossed with peppers, spring onion and chaat masala.', 260, '/images/food/crispy-corn.jpg', true, false, 4.3),
((SELECT id FROM public.food_categories WHERE slug='main-course'), 'butter-chicken', 'Butter Chicken', 'Tandoori chicken simmered in a velvety tomato-butter gravy, served with naan.', 520, '/images/food/butter-chicken.jpg', false, true, 4.9),
((SELECT id FROM public.food_categories WHERE slug='main-course'), 'dal-makhani', 'Dal Makhani', 'Slow-cooked black lentils finished with butter and cream, a GrandStay classic.', 360, '/images/food/dal-makhani.jpg', true, true, 4.7),
((SELECT id FROM public.food_categories WHERE slug='main-course'), 'lamb-rogan-josh', 'Lamb Rogan Josh', 'Kashmiri-style lamb curry with aromatic spices, served with steamed basmati rice.', 640, '/images/food/lamb-rogan-josh.jpg', false, false, 4.6),
((SELECT id FROM public.food_categories WHERE slug='biriyani'), 'hyderabadi-chicken-biryani', 'Hyderabadi Chicken Biryani', 'Fragrant dum-cooked basmati layered with saffron chicken, served with raita and salan.', 480, '/images/food/hyderabadi-chicken-biryani.jpg', false, true, 4.9),
((SELECT id FROM public.food_categories WHERE slug='biriyani'), 'mutton-biryani', 'Mutton Biryani', 'Tender mutton slow-cooked with whole spices, caramelised onions and mint.', 620, '/images/food/mutton-biryani.jpg', false, true, 4.8),
((SELECT id FROM public.food_categories WHERE slug='biriyani'), 'veg-dum-biryani', 'Veg Dum Biryani', 'Seasonal vegetables, paneer and basmati layered with saffron and rose water.', 380, '/images/food/veg-dum-biryani.jpg', true, false, 4.5),
((SELECT id FROM public.food_categories WHERE slug='chinese'), 'hakka-noodles', 'Hakka Noodles', 'Wok-tossed noodles with crunchy vegetables, soy and a hint of sesame.', 320, '/images/food/hakka-noodles.jpg', true, false, 4.4),
((SELECT id FROM public.food_categories WHERE slug='chinese'), 'chilli-chicken', 'Chilli Chicken', 'Crispy chicken tossed with peppers, onions and a fiery Indo-Chinese sauce.', 420, '/images/food/chilli-chicken.jpg', false, true, 4.7),
((SELECT id FROM public.food_categories WHERE slug='chinese'), 'kung-pao-prawns', 'Kung Pao Prawns', 'Stir-fried prawns with roasted peanuts, dried chillies and Sichuan peppercorn.', 580, '/images/food/kung-pao-prawns.jpg', false, false, 4.6),
((SELECT id FROM public.food_categories WHERE slug='desserts'), 'gulab-jamun', 'Gulab Jamun', 'Warm milk dumplings soaked in cardamom and rose syrup, served with vanilla ice cream.', 180, '/images/food/gulab-jamun.jpg', true, true, 4.8),
((SELECT id FROM public.food_categories WHERE slug='desserts'), 'chocolate-lava-cake', 'Chocolate Lava Cake', 'Molten Belgian chocolate cake with salted caramel and vanilla bean ice cream.', 320, '/images/food/chocolate-lava-cake.jpg', true, true, 4.9),
((SELECT id FROM public.food_categories WHERE slug='desserts'), 'rasmalai', 'Rasmalai', 'Soft cottage cheese discs in saffron-pistachio milk, chilled.', 220, '/images/food/rasmalai.jpg', true, false, 4.6),
((SELECT id FROM public.food_categories WHERE slug='beverages'), 'masala-chai', 'Masala Chai', 'Freshly brewed Assam tea with ginger, cardamom and cinnamon.', 120, '/images/food/masala-chai.jpg', true, false, 4.5),
((SELECT id FROM public.food_categories WHERE slug='beverages'), 'fresh-lime-soda', 'Fresh Lime Soda', 'Sparkling soda with fresh lime, mint and a choice of sweet or salted.', 140, '/images/food/fresh-lime-soda.jpg', true, false, 4.3),
((SELECT id FROM public.food_categories WHERE slug='beverages'), 'mango-lassi', 'Mango Lassi', 'Thick Alphonso mango and yoghurt smoothie with a hint of cardamom.', 180, '/images/food/mango-lassi.jpg', true, true, 4.8);

-- ========== SEED: COUPONS ==========
INSERT INTO public.coupons (code, description, discount_type, value, min_amount, max_discount) VALUES
('WELCOME10', '10% off your first booking or order', 'percent', 10, 500, 2500),
('STAY20', '20% off room bookings above ₹15,000', 'percent', 20, 15000, 8000),
('FOODIE500', 'Flat ₹500 off food orders above ₹2,000', 'fixed', 500, 2000, NULL);