-- Content Reporting System
-- Allows users to report inappropriate content for moderation

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(id) NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN (
    'post',
    'comment',
    'debate',
    'argument',
    'policy',
    'amendment',
    'negotiation_demand',
    'boycott_proposal',
    'boycott_comment',
    'worker_proposal',
    'worker_comment',
    'politician',
    'bill',
    'donor',
    'corporate_exploitation',
    'organizing_resistance',
    'worker_rights_legislation',
    'solidarity_victories'
  )),
  content_id UUID NOT NULL,
  union_id UUID REFERENCES unions(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reports_content ON reports(content_type, content_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reports_union ON reports(union_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC) WHERE deleted_at IS NULL;

-- Prevent duplicate reports from same user on same content
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_unique_user_content 
  ON reports(reporter_id, content_type, content_id) 
  WHERE deleted_at IS NULL;

-- RLS Policies
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Policy: Any authenticated user can create a report
CREATE POLICY "Users can create reports"
  ON reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Policy: Users can view their own reports
CREATE POLICY "Users can view own reports"
  ON reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- Policy: Union admins can view reports for their union's content
CREATE POLICY "Union admins can view union reports"
  ON reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM union_members
      WHERE union_members.union_id = reports.union_id
        AND union_members.user_id = auth.uid()
        AND union_members.role IN ('admin', 'owner')
        AND union_members.deleted_at IS NULL
    )
  );

-- Policy: Union admins can update reports for their union's content
CREATE POLICY "Union admins can update union reports"
  ON reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM union_members
      WHERE union_members.union_id = reports.union_id
        AND union_members.user_id = auth.uid()
        AND union_members.role IN ('admin', 'owner')
        AND union_members.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM union_members
      WHERE union_members.union_id = reports.union_id
        AND union_members.user_id = auth.uid()
        AND union_members.role IN ('admin', 'owner')
        AND union_members.deleted_at IS NULL
    )
  );

-- Policy: Users can soft-delete their own reports
CREATE POLICY "Users can delete own reports"
  ON reports
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = reporter_id)
  WITH CHECK (auth.uid() = reporter_id AND deleted_at IS NOT NULL);

-- Function to auto-set reviewed_at timestamp
CREATE OR REPLACE FUNCTION set_report_reviewed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('reviewed', 'dismissed', 'actioned') THEN
    NEW.reviewed_at = NOW();
    NEW.reviewed_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-set reviewed_at
DROP TRIGGER IF EXISTS trigger_set_report_reviewed_at ON reports;
CREATE TRIGGER trigger_set_report_reviewed_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION set_report_reviewed_at();

-- Function to get union_id from content
-- This helps associate reports with the correct union for moderation
CREATE OR REPLACE FUNCTION get_content_union_id(
  p_content_type TEXT,
  p_content_id UUID
) RETURNS UUID AS $$
DECLARE
  v_union_id UUID;
BEGIN
  CASE p_content_type
    WHEN 'post' THEN
      SELECT union_id INTO v_union_id FROM posts WHERE id = p_content_id;
    WHEN 'comment' THEN
      SELECT p.union_id INTO v_union_id 
      FROM comments c
      JOIN posts p ON c.post_id = p.id
      WHERE c.id = p_content_id;
    WHEN 'debate' THEN
      SELECT union_id INTO v_union_id FROM debates WHERE id = p_content_id;
    WHEN 'argument' THEN
      SELECT d.union_id INTO v_union_id
      FROM arguments a
      JOIN debates d ON a.debate_id = d.id
      WHERE a.id = p_content_id;
    WHEN 'policy' THEN
      SELECT union_id INTO v_union_id FROM policies WHERE id = p_content_id;
    WHEN 'amendment' THEN
      SELECT p.union_id INTO v_union_id
      FROM amendments a
      JOIN policies p ON a.policy_id = p.id
      WHERE a.id = p_content_id;
    WHEN 'negotiation_demand' THEN
      SELECT union_id INTO v_union_id FROM negotiation_demands WHERE id = p_content_id;
    WHEN 'boycott_proposal' THEN
      SELECT union_id INTO v_union_id FROM boycott_proposals WHERE id = p_content_id;
    WHEN 'boycott_comment' THEN
      SELECT bp.union_id INTO v_union_id
      FROM boycott_comments bc
      JOIN boycott_proposals bp ON bc.proposal_id = bp.id
      WHERE bc.id = p_content_id;
    WHEN 'worker_proposal' THEN
      SELECT union_id INTO v_union_id FROM worker_proposals WHERE id = p_content_id;
    WHEN 'worker_comment' THEN
      SELECT wp.union_id INTO v_union_id
      FROM worker_comments wc
      JOIN worker_proposals wp ON wc.proposal_id = wp.id
      WHERE wc.id = p_content_id;
    ELSE
      v_union_id = NULL;
  END CASE;
  
  RETURN v_union_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-populate union_id when report is created
CREATE OR REPLACE FUNCTION auto_populate_report_union_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.union_id IS NULL THEN
    NEW.union_id = get_content_union_id(NEW.content_type, NEW.content_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_populate_report_union_id ON reports;
CREATE TRIGGER trigger_auto_populate_report_union_id
  BEFORE INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_report_union_id();
