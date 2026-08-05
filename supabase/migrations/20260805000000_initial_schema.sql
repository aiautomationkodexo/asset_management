-- Initial Schema for Internal Asset Management System (Phase 1)

-- 1. app_admins
CREATE TABLE app_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    added_by UUID REFERENCES app_admins(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- is_admin RPC used for RLS policies
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM app_admins 
        WHERE email = auth.jwt() ->> 'email' 
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. asset_categories
CREATE TABLE asset_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    tag_prefix TEXT UNIQUE NOT NULL,
    is_depreciable BOOLEAN NOT NULL DEFAULT true,
    default_useful_life_months INTEGER,
    default_tax_depr_rate NUMERIC,
    is_physical BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID -- will map to auth user id
);

-- 3. locations
CREATE TYPE location_type AS ENUM ('desk', 'room', 'store', 'offsite');

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type location_type NOT NULL,
    parent_id UUID REFERENCES locations(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID
);

-- 4. Tag Sequence Table for collision-safe tag generation
CREATE TABLE tag_sequences (
    category_prefix TEXT NOT NULL,
    year INTEGER NOT NULL,
    last_sequence INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (category_prefix, year)
);

-- 5. assets
CREATE TYPE asset_condition AS ENUM ('new', 'good', 'fair', 'poor');
CREATE TYPE asset_status AS ENUM ('in_stock', 'assigned', 'in_repair', 'lost', 'disposed');

CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_slug TEXT UNIQUE NOT NULL,
    asset_tag TEXT UNIQUE NOT NULL,
    category_id UUID REFERENCES asset_categories(id) NOT NULL,
    make TEXT,
    model TEXT,
    serial_no TEXT,
    condition asset_condition NOT NULL,
    status asset_status NOT NULL DEFAULT 'in_stock',
    location_id UUID REFERENCES locations(id),
    purchase_id UUID, -- For future phase purchases
    purchase_cost_base NUMERIC,
    in_service_date DATE,
    useful_life_months INTEGER,
    salvage_value NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_assets_serial_no ON assets(serial_no);

-- RPC for secure Tag Generation
CREATE OR REPLACE FUNCTION generate_asset_tag(cat_prefix TEXT) RETURNS TEXT AS $$
DECLARE
    current_year INTEGER;
    seq INTEGER;
    new_tag TEXT;
BEGIN
    current_year := extract(year from current_date);
    
    INSERT INTO tag_sequences (category_prefix, year, last_sequence)
    VALUES (cat_prefix, current_year, 1)
    ON CONFLICT (category_prefix, year) 
    DO UPDATE SET last_sequence = tag_sequences.last_sequence + 1
    RETURNING last_sequence INTO seq;
    
    new_tag := 'KDX-' || cat_prefix || '-' || right(current_year::TEXT, 2) || '-' || lpad(seq::TEXT, 4, '0');
    
    RETURN new_tag;
END;
$$ LANGUAGE plpgsql;

-- RPC for secure slug generation (excluding 0, O, I, l, 1)
CREATE OR REPLACE FUNCTION generate_slug() RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    result TEXT := '';
    i INTEGER := 0;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate tag and slug on asset insert
CREATE OR REPLACE FUNCTION trig_asset_before_insert() RETURNS TRIGGER AS $$
DECLARE
    cat_prefix TEXT;
    new_slug TEXT;
    slug_exists BOOLEAN;
BEGIN
    -- generate unique slug
    LOOP
        new_slug := generate_slug();
        SELECT EXISTS(SELECT 1 FROM assets WHERE public_slug = new_slug) INTO slug_exists;
        EXIT WHEN NOT slug_exists;
    END LOOP;
    
    NEW.public_slug := new_slug;
    
    -- fetch category prefix
    SELECT tag_prefix INTO cat_prefix FROM asset_categories WHERE id = NEW.category_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Category not found';
    END IF;
    
    -- generate tag
    NEW.asset_tag := generate_asset_tag(cat_prefix);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER asset_insert_trigger
BEFORE INSERT ON assets
FOR EACH ROW
EXECUTE FUNCTION trig_asset_before_insert();


-- --- RLS POLICIES ---

ALTER TABLE app_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Only admins can see and edit app_admins
CREATE POLICY "Admins can view app_admins" ON app_admins FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert app_admins" ON app_admins FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update app_admins" ON app_admins FOR UPDATE USING (is_admin());
-- Admins cannot delete admins, they can only deactivate (soft-delete handled by is_active)

-- Admins can do everything on categories, locations, assets
CREATE POLICY "Admins can do everything on asset_categories" ON asset_categories FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything on locations" ON locations FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything on tag_sequences" ON tag_sequences FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything on assets" ON assets FOR ALL USING (is_admin());

-- Anonymous user gets NO direct grants on base tables. 
-- We will create a security definer RPC or view for public scan.

CREATE OR REPLACE FUNCTION get_public_asset(slug TEXT)
RETURNS TABLE (
    asset_tag TEXT,
    category_name TEXT,
    make TEXT,
    model TEXT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.asset_tag,
        c.name,
        a.make,
        a.model,
        a.status::TEXT
    FROM assets a
    JOIN asset_categories c ON a.category_id = c.id
    WHERE a.public_slug = slug AND a.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
