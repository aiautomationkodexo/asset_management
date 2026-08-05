-- "Remove auth for now" — explicit product decision, made at the user's
-- direction. Anonymous requests can now read AND write asset_categories,
-- locations, assets, and tag_sequences (needed transitively: the asset
-- insert trigger writes to tag_sequences to generate tags). Nobody needs to
-- sign in for anything in the admin console anymore.
--
-- This is a live, deliberate exposure of real data and write access to
-- anyone with the project URL until reverted.
--
-- Deliberately NOT opened: app_admins. That table is what is_admin() reads
-- to decide who is an administrator. Opening it would let any anonymous
-- visitor grant themselves admin rights or deactivate the real admin — a
-- distinct, worse problem than opening asset data, and unrelated to "no
-- login to view/edit assets." It stays gated behind is_admin() exactly as
-- before.
--
-- Nothing here touches is_admin() or the original admin-only "FOR ALL"
-- policies (still USING (is_admin())) — they remain in place underneath
-- this, unused while every request runs as anon, ready to matter again if
-- real sign-in is ever required again.
--
-- To revert: drop the four "Public can do everything on ..." policies
-- below and revoke the matching GRANTs.

GRANT SELECT, INSERT, UPDATE, DELETE ON asset_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON locations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON assets TO anon;
GRANT SELECT, INSERT, UPDATE ON tag_sequences TO anon;

CREATE POLICY "Public can do everything on asset_categories" ON asset_categories
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Public can do everything on locations" ON locations
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Public can do everything on assets" ON assets
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Public can read/write tag_sequences" ON tag_sequences
  FOR ALL TO anon USING (true) WITH CHECK (true);
