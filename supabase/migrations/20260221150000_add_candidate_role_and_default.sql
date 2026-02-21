-- user_role enum に candidate を追加（公開会員登録は求職者のみのため）
-- 同一トランザクションで新しい enum 値を使うと 55P04 になるため、このマイグレーションでは追加のみ行う
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'candidate';
