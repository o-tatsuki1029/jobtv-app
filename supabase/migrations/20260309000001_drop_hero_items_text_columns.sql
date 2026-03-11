ALTER TABLE top_page_hero_items
  DROP COLUMN IF EXISTS title,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS channel,
  DROP COLUMN IF EXISTS viewers;
