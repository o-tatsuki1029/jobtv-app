-- profiles のデフォルトを candidate に変更（新規 signUp は求職者のみとする）
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'candidate'::public.user_role;

-- handle_new_user: 既存 profile が同じ email でなければ candidate をデフォルトにする
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  existing_role public.user_role;
  user_role_value public.user_role;
BEGIN
  -- profilesテーブルに同じメールアドレスの既存レコードがあるか確認
  -- リクルーター作成時に先にprofilesに登録されている場合があるため
  BEGIN
    SELECT role INTO existing_role
    FROM public.profiles
    WHERE email = NEW.email
    LIMIT 1;
  EXCEPTION
    WHEN OTHERS THEN
      existing_role := NULL;
  END;

  -- 既存のroleがある場合はそれを使用、なければ candidate（公開登録は求職者のみ）
  user_role_value := COALESCE(
    existing_role,
    'candidate'::public.user_role
  );

  BEGIN
    INSERT INTO public.profiles (id, email, role, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      user_role_value,
      NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET email = NEW.email,
        role = user_role_value,
        updated_at = NOW();
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user trigger error for user % (email: %): % (SQLSTATE: %)',
        NEW.id, NEW.email, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user trigger fatal error for user % (email: %): % (SQLSTATE: %)',
      NEW.id, NEW.email, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$function$;
