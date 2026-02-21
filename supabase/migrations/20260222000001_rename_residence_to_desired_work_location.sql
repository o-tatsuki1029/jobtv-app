-- お住まいの都道府県 → 希望勤務地（DB カラム名変更）
ALTER TABLE public.candidates RENAME COLUMN residence_location TO desired_work_location;
