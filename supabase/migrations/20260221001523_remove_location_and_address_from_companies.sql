-- companiesテーブルとcompanies_draftテーブルからlocationとaddressカラムを削除
-- locationはprefectureに、addressはprefecture + address_line1 + address_line2に置き換え

-- companiesテーブルからlocationとaddressカラムを削除
ALTER TABLE companies DROP COLUMN IF EXISTS location;
ALTER TABLE companies DROP COLUMN IF EXISTS address;

-- companies_draftテーブルからlocationとaddressカラムを削除
ALTER TABLE companies_draft DROP COLUMN IF EXISTS location;
ALTER TABLE companies_draft DROP COLUMN IF EXISTS address;

