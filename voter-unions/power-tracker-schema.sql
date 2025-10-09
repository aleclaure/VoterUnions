-- Power Tracker Feature Schema
-- User-curated content for tracking political power, money, and influence

-- Politicians table
CREATE TABLE IF NOT EXISTS power_politicians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  office TEXT NOT NULL,
  party TEXT,
  state TEXT,
  bio TEXT,
  photo_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Donors table (tracks who donates to politicians)
CREATE TABLE IF NOT EXISTS power_donors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  politician_id UUID REFERENCES power_politicians(id) ON DELETE CASCADE,
  donor_name TEXT NOT NULL,
  donor_type TEXT CHECK (donor_type IN ('individual', 'pac', 'corporation', 'other')),
  amount DECIMAL(15, 2),
  industry TEXT,
  date DATE,
  notes TEXT,
  source_link TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Bills table
CREATE TABLE IF NOT EXISTS power_bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_number TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT CHECK (status IN ('introduced', 'passed_house', 'passed_senate', 'enacted', 'failed')),
  analysis TEXT,
  source_link TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Beneficiaries table (which corporations/industries benefit from bills)
CREATE TABLE IF NOT EXISTS power_beneficiaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID REFERENCES power_bills(id) ON DELETE CASCADE,
  corporation_name TEXT NOT NULL,
  industry TEXT,
  how_they_profit TEXT NOT NULL,
  estimated_benefit TEXT,
  source_link TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Graphics table (wealth inequality infographics and data visualizations)
CREATE TABLE IF NOT EXISTS power_graphics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  category TEXT CHECK (category IN ('wealth_inequality', 'tax_avoidance', 'corporate_power', 'campaign_finance', 'other')),
  source_link TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Power Pledges table (pledges to vote against politicians or support reforms)
CREATE TABLE IF NOT EXISTS power_pledges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  union_id UUID REFERENCES unions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT CHECK (target_type IN ('politician', 'bill', 'reform')) NOT NULL,
  politician_id UUID REFERENCES power_politicians(id) ON DELETE CASCADE,
  bill_id UUID REFERENCES power_bills(id) ON DELETE CASCADE,
  action TEXT CHECK (action IN ('vote_against', 'support_reform', 'oppose_reform')) NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(union_id, user_id, target_type, politician_id, bill_id)
);

-- Bill-Politician relationships (which politicians sponsored/voted for bills)
CREATE TABLE IF NOT EXISTS power_bill_politicians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID REFERENCES power_bills(id) ON DELETE CASCADE,
  politician_id UUID REFERENCES power_politicians(id) ON DELETE CASCADE,
  relationship_type TEXT CHECK (relationship_type IN ('sponsor', 'cosponsor', 'voted_for', 'voted_against')) NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(bill_id, politician_id, relationship_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_power_politicians_name ON power_politicians(name);
CREATE INDEX IF NOT EXISTS idx_power_politicians_created_at ON power_politicians(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_power_donors_politician_id ON power_donors(politician_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_power_donors_industry ON power_donors(industry);
CREATE INDEX IF NOT EXISTS idx_power_bills_created_at ON power_bills(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_power_bills_status ON power_bills(status);
CREATE INDEX IF NOT EXISTS idx_power_beneficiaries_bill_id ON power_beneficiaries(bill_id);
CREATE INDEX IF NOT EXISTS idx_power_beneficiaries_industry ON power_beneficiaries(industry);
CREATE INDEX IF NOT EXISTS idx_power_graphics_category ON power_graphics(category);
CREATE INDEX IF NOT EXISTS idx_power_graphics_created_at ON power_graphics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_power_pledges_union_id ON power_pledges(union_id);
CREATE INDEX IF NOT EXISTS idx_power_pledges_user_id ON power_pledges(user_id);
CREATE INDEX IF NOT EXISTS idx_power_pledges_politician_id ON power_pledges(politician_id);
CREATE INDEX IF NOT EXISTS idx_power_pledges_bill_id ON power_pledges(bill_id);
CREATE INDEX IF NOT EXISTS idx_power_bill_politicians_bill_id ON power_bill_politicians(bill_id);
CREATE INDEX IF NOT EXISTS idx_power_bill_politicians_politician_id ON power_bill_politicians(politician_id);

-- Row Level Security (RLS) Policies
ALTER TABLE power_politicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE power_donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE power_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE power_beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE power_graphics ENABLE ROW LEVEL SECURITY;
ALTER TABLE power_pledges ENABLE ROW LEVEL SECURITY;
ALTER TABLE power_bill_politicians ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Anyone authenticated can read, creators can modify their own content

-- Politicians policies
CREATE POLICY "Anyone can view politicians" ON power_politicians FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "Authenticated users can create politicians" ON power_politicians FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators can update their politicians" ON power_politicians FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Creators can delete their politicians" ON power_politicians FOR DELETE USING (auth.uid() = created_by);

-- Donors policies
CREATE POLICY "Anyone can view donors" ON power_donors FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "Authenticated users can create donors" ON power_donors FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators can update their donors" ON power_donors FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Creators can delete their donors" ON power_donors FOR DELETE USING (auth.uid() = created_by);

-- Bills policies
CREATE POLICY "Anyone can view bills" ON power_bills FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "Authenticated users can create bills" ON power_bills FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators can update their bills" ON power_bills FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Creators can delete their bills" ON power_bills FOR DELETE USING (auth.uid() = created_by);

-- Beneficiaries policies
CREATE POLICY "Anyone can view beneficiaries" ON power_beneficiaries FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "Authenticated users can create beneficiaries" ON power_beneficiaries FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators can update their beneficiaries" ON power_beneficiaries FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Creators can delete their beneficiaries" ON power_beneficiaries FOR DELETE USING (auth.uid() = created_by);

-- Graphics policies
CREATE POLICY "Anyone can view graphics" ON power_graphics FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "Authenticated users can create graphics" ON power_graphics FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators can update their graphics" ON power_graphics FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Creators can delete their graphics" ON power_graphics FOR DELETE USING (auth.uid() = created_by);

-- Pledges policies
CREATE POLICY "Anyone can view pledges" ON power_pledges FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "Users can create their own pledges" ON power_pledges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own pledges" ON power_pledges FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own pledges" ON power_pledges FOR DELETE USING (auth.uid() = user_id);

-- Bill-Politicians policies
CREATE POLICY "Anyone can view bill-politician relationships" ON power_bill_politicians FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "Authenticated users can create bill-politician relationships" ON power_bill_politicians FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators can update their bill-politician relationships" ON power_bill_politicians FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Creators can delete their bill-politician relationships" ON power_bill_politicians FOR DELETE USING (auth.uid() = created_by);
