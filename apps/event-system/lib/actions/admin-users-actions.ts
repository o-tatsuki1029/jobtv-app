"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

// Supabase Admin API用のクライアント
// 注意: この関数は重複しているため、@/lib/supabase/adminからインポートすることを推奨
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }

  if (!supabaseServiceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// 管理者アカウント作成
export async function createAdminUser(email: string, password: string) {
  try {
    const adminClient = getAdminClient();

    // ランダムなパスワードを生成（パスワードが指定されていない場合）
    const finalPassword = password || generateRandomPassword();

    // auth.usersにユーザーを作成（user_metadataは使用しない）
    const { data: authUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password: finalPassword,
        email_confirm: true, // メール確認をスキップ
      });

    if (createError) {
      return {
        success: false,
        error: createError.message || "ユーザー作成に失敗しました",
        password: null,
      };
    }

    if (!authUser.user) {
      return {
        success: false,
        error: "ユーザー作成に失敗しました",
        password: null,
      };
    }

    // トリガーで作成されたprofilesレコードを待機（最大3秒、100ms間隔でポーリング）
    let profileExists = false;
    for (let i = 0; i < 30; i++) {
      const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("id")
        .eq("id", authUser.user.id)
        .single();
      
      if (existingProfile) {
        profileExists = true;
        break;
      }
      
      // 100ms待機
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // トリガーで作成されたprofilesレコードを更新して管理者ロールを設定
    // profiles.roleを唯一の情報源として管理
    // レコードが存在する場合は更新、存在しない場合はupsertで作成
    const profileData = {
      id: authUser.user.id,
      email: email,
      role: "admin" as const,
      updated_at: new Date().toISOString(),
    };

    let upsertError;
    if (profileExists) {
      // レコードが存在する場合は更新
      const { error } = await adminClient
        .from("profiles")
        .update(profileData)
        .eq("id", authUser.user.id);
      upsertError = error;
    } else {
      // レコードが存在しない場合はupsert
      const { error } = await adminClient
        .from("profiles")
        .upsert(profileData, {
          onConflict: 'id'
        });
      upsertError = error;
    }

    if (upsertError) {
      const errorMessage = upsertError.message || 
        (typeof upsertError === 'object' && upsertError !== null && 'message' in upsertError 
          ? String(upsertError.message) 
          : JSON.stringify(upsertError));
      const errorCode = typeof upsertError === 'object' && upsertError !== null && 'code' in upsertError
        ? String(upsertError.code)
        : 'unknown';
      const errorDetails = typeof upsertError === 'object' && upsertError !== null && 'details' in upsertError
        ? String(upsertError.details)
        : '';
      const errorHint = typeof upsertError === 'object' && upsertError !== null && 'hint' in upsertError
        ? String(upsertError.hint)
        : '';
      
      console.error("profilesテーブルupsert/updateエラー:", {
        error: upsertError,
        message: errorMessage,
        code: errorCode,
        details: errorDetails,
        hint: errorHint,
        userId: authUser.user.id,
        profileExists,
        profileData,
      });
      
      // より詳細なエラーメッセージを構築
      let detailedMessage = `プロファイル情報の更新に失敗しました: ${errorMessage}`;
      if (errorCode !== 'unknown') {
        detailedMessage += ` (コード: ${errorCode})`;
      }
      if (errorDetails) {
        detailedMessage += ` - ${errorDetails}`;
      }
      if (errorHint) {
        detailedMessage += ` (ヒント: ${errorHint})`;
      }
      
      return {
        success: false,
        error: detailedMessage,
        password: null,
      };
    }

    return {
      success: true,
      error: null,
      password: finalPassword,
    };
  } catch (error: unknown) {
    console.error("管理者アカウント作成エラー:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "予期しないエラーが発生しました",
      password: null,
    };
  }
}

// パスワードリセット
export async function resetUserPassword(userId: string) {
  try {
    const adminClient = getAdminClient();
    const newPassword = generateRandomPassword();

    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? String((error as { message: string }).message)
          : "パスワードリセットに失敗しました";
      return {
        success: false,
        error: errorMessage,
        password: null,
      };
    }

    return {
      success: true,
      error: null,
      password: newPassword,
    };
  } catch (error: unknown) {
    console.error("パスワードリセットエラー:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "予期しないエラーが発生しました",
      password: null,
    };
  }
}

// ユーザー削除
export async function deleteUser(userId: string) {
  try {
    const adminClient = getAdminClient();

    // auth.usersから削除（CASCADEでusersテーブルからも削除される）
    const { error } = await adminClient.auth.admin.deleteUser(userId);

    if (error) {
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? String((error as { message: string }).message)
          : "ユーザー削除に失敗しました";
      return {
        success: false,
        error: errorMessage,
      };
    }

    return {
      success: true,
      error: null,
    };
  } catch (error: unknown) {
    console.error("ユーザー削除エラー:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "予期しないエラーが発生しました",
    };
  }
}

// リクルーターアカウント作成
export async function createRecruiterUser(
  email: string,
  password: string,
  companyId: string,
  recruiterData: {
    last_name: string;
    first_name: string;
    last_name_kana: string;
    first_name_kana: string;
  }
) {
  console.log("createRecruiterUser開始:", { email, companyId });
  try {
    const adminClient = getAdminClient();
    console.log("Admin Client取得完了");

    // ランダムなパスワードを生成（パスワードが指定されていない場合）
    const finalPassword = password || generateRandomPassword();

    // auth.usersにユーザーを作成（user_metadataは使用しない）
    // profiles.roleを唯一の情報源として管理するため
    console.log("auth.users作成開始:", { email, hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY });
    
    let createError: unknown = null;
    let userId: string | null = null;
    
    try {
      const result = await adminClient.auth.admin.createUser({
        email,
        password: finalPassword,
        email_confirm: true, // メール確認をスキップ
      });
      
      if (result.error) {
        createError = result.error;
      } else if (result.data?.user) {
        userId = result.data.user.id;
      } else {
        createError = new Error("ユーザーオブジェクトが取得できませんでした");
      }
    } catch (error) {
      console.error("auth.users作成で例外発生:", error);
      createError = error;
    }

    if (createError) {
      const errorMessage = createError instanceof Error
        ? createError.message
        : typeof createError === 'object' && createError !== null && 'message' in createError
          ? String((createError as { message: string }).message)
          : "ユーザー作成に失敗しました";
      const errorCode = typeof createError === 'object' && createError !== null && 'code' in createError
        ? String((createError as { code: string }).code)
        : 'unknown';
      
      console.error("auth.users作成エラー:", {
        error: createError,
        message: errorMessage,
        code: errorCode,
        email,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length,
      });
      
      // エラーメッセージを構築
      let detailedMessage = `ユーザー作成に失敗しました: ${errorMessage}`;
      if (errorCode === 'unexpected_failure') {
        // unexpected_failureは通常、トリガー関数のエラーを示す
        detailedMessage += " (データベーストリガー関数でエラーが発生した可能性があります。Supabaseのログを確認してください)";
      } else if (errorCode === 'invalid_api_key') {
        detailedMessage += " (Service Role Keyが正しくない可能性があります。Supabaseダッシュボードで確認してください)";
      } else if (errorCode !== 'unknown') {
        detailedMessage += ` (コード: ${errorCode})`;
      }
      
      return {
        success: false,
        error: detailedMessage,
        password: null,
        userId: null,
      };
    }

    if (!userId) {
      console.error("auth.users作成エラー: userIdが取得できませんでした");
      return {
        success: false,
        error: "ユーザー作成に失敗しました（ユーザーIDが取得できませんでした）",
        password: null,
        userId: null,
      };
    }
    
    console.log("auth.users作成成功:", { userId, email });

    // トリガーで作成されたprofilesレコードを待機（最大3秒、100ms間隔でポーリング）
    console.log("profilesレコード待機開始");
    let profileExists = false;
    for (let i = 0; i < 30; i++) {
      const { data: existingProfile, error: checkError } = await adminClient
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error("profilesレコード確認エラー:", checkError);
      }
      
      if (existingProfile) {
        profileExists = true;
        console.log("profilesレコード確認成功:", { attempt: i + 1 });
        break;
      }
      
      // 100ms待機
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log("profilesレコード待機完了:", { profileExists });

    // トリガーで作成されたprofilesレコードを更新してリクルーター情報を追加
    // profiles.roleを唯一の情報源として管理
    // レコードが存在する場合は更新、存在しない場合はupsertで作成
    const now = new Date().toISOString();
    const profileData: {
      id: string;
      email: string;
      role: "recruiter";
      company_id: string;
      last_name: string;
      first_name: string;
      last_name_kana: string;
      first_name_kana: string;
      created_at?: string;
      updated_at: string | null;
    } = {
      id: userId,
      email: email,
      role: "recruiter" as const,
      company_id: companyId,
      last_name: recruiterData.last_name,
      first_name: recruiterData.first_name,
      last_name_kana: recruiterData.last_name_kana,
      first_name_kana: recruiterData.first_name_kana,
      updated_at: now,
    };
    
    // created_atは設定しない（DEFAULT値が自動的に設定される）
    delete profileData.created_at;

    console.log("profilesテーブル更新/upsert開始:", { profileExists, profileData });
    let upsertError;
    if (profileExists) {
      // レコードが存在する場合は更新
      console.log("profilesテーブル更新実行");
      const { error } = await adminClient
        .from("profiles")
        .update(profileData)
        .eq("id", userId);
      upsertError = error;
      if (error) {
        console.error("profilesテーブル更新エラー:", error);
      } else {
        console.log("profilesテーブル更新成功");
      }
    } else {
      // レコードが存在しない場合はupsert
      console.log("profilesテーブルupsert実行");
      const { error } = await adminClient
        .from("profiles")
        .upsert(profileData, {
          onConflict: 'id'
        });
      upsertError = error;
      if (error) {
        console.error("profilesテーブルupsertエラー:", error);
      } else {
        console.log("profilesテーブルupsert成功");
      }
    }

    if (upsertError) {
      const errorMessage = upsertError.message || 
        (typeof upsertError === 'object' && upsertError !== null && 'message' in upsertError 
          ? String(upsertError.message) 
          : JSON.stringify(upsertError));
      const errorCode = typeof upsertError === 'object' && upsertError !== null && 'code' in upsertError
        ? String(upsertError.code)
        : 'unknown';
      const errorDetails = typeof upsertError === 'object' && upsertError !== null && 'details' in upsertError
        ? String(upsertError.details)
        : '';
      const errorHint = typeof upsertError === 'object' && upsertError !== null && 'hint' in upsertError
        ? String(upsertError.hint)
        : '';
      
      console.error("profilesテーブルupsert/updateエラー:", {
        error: upsertError,
        message: errorMessage,
        code: errorCode,
        details: errorDetails,
        hint: errorHint,
        userId: userId,
        profileExists,
        profileData,
      });
      
      // より詳細なエラーメッセージを構築
      let detailedMessage = `プロファイル情報の更新に失敗しました: ${errorMessage}`;
      if (errorCode !== 'unknown') {
        detailedMessage += ` (コード: ${errorCode})`;
      }
      if (errorDetails) {
        detailedMessage += ` - ${errorDetails}`;
      }
      if (errorHint) {
        detailedMessage += ` (ヒント: ${errorHint})`;
      }
      
      return {
        success: false,
        error: detailedMessage,
        password: null,
        userId: null,
      };
    }

    return {
      success: true,
      error: null,
      password: finalPassword,
      userId: userId,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: string }).message)
        : JSON.stringify(error);
    
    const errorDetails = error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : typeof error === 'object' && error !== null
        ? error
        : { raw: error };
    
    console.error("リクルーターアカウント作成エラー（catch）:", {
      error,
      errorMessage,
      errorDetails,
      email,
      companyId,
    });
    
    return {
      success: false,
      error: `リクルーターアカウント作成中にエラーが発生しました: ${errorMessage}`,
      password: null,
      userId: null,
    };
  }
}

// リクルーター情報を更新
export async function updateRecruiterProfile(
  recruiterId: string,
  updateData: {
    last_name: string;
    first_name: string;
    last_name_kana: string;
    first_name_kana: string;
  }
) {
  try {
    const adminClient = getAdminClient();

    const { error } = await adminClient
      .from("profiles")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recruiterId);

    if (error) {
      const errorMessage = error.message || 
        (typeof error === 'object' && error !== null && 'message' in error 
          ? String(error.message) 
          : JSON.stringify(error));
      
      console.error("リクルーター更新エラー:", {
        error,
        message: errorMessage,
        recruiterId,
        updateData,
      });

      return {
        success: false,
        error: `リクルーター情報の更新に失敗しました: ${errorMessage}`,
      };
    }

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    console.error("リクルーター更新エラー:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "リクルーター情報の更新に失敗しました",
    };
  }
}

// 既存のリクルーターにauth.usersアカウントを作成
// 注意: この関数は、既にprofilesテーブルに存在するリクルーター（一時的なIDで作成されたもの）には使用できない
// profiles.idはauth.users.idと一致する必要があるため、先にauth.usersを作成してからprofilesに登録する必要がある
export async function createAuthAccountForRecruiter(recruiterId: string) {
  try {
    const adminClient = getAdminClient();
    
    // リクルーター情報を取得（Admin Clientを使用）
    const { data: recruiter, error: recruiterError } = await adminClient
      .from("profiles")
      .select("id, email, company_id, last_name, first_name, last_name_kana, first_name_kana")
      .eq("id", recruiterId)
      .single();

    if (recruiterError || !recruiter) {
      return {
        success: false,
        error: "リクルーター情報が見つかりません",
        password: null,
      };
    }

    // 既にauth.usersに存在するか確認
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(
      (u) => u.email === recruiter.email
    );

    if (existingUser) {
      // 既に存在する場合、profilesテーブルのidを更新（Admin Clientを使用）
      const { error: updateError } = await adminClient
        .from("profiles")
        .update({ id: existingUser.id })
        .eq("id", recruiterId);

      if (updateError) {
        return {
          success: false,
          error: "リクルーターIDの更新に失敗しました",
          password: null,
        };
      }

      return {
        success: true,
        error: null,
        password: null, // 既存アカウントのためパスワードは返さない
      };
    }

    // 新規アカウントを作成
    if (!recruiter.company_id) {
      return {
        success: false,
        error: "企業IDが設定されていません",
        password: null,
      };
    }

    const result = await createRecruiterUser(
      recruiter.email,
      "",
      recruiter.company_id,
      {
        last_name: recruiter.last_name || "",
        first_name: recruiter.first_name || "",
        last_name_kana: recruiter.last_name_kana || "",
        first_name_kana: recruiter.first_name_kana || "",
      }
    );

    return result;
  } catch (error: unknown) {
    console.error("既存リクルーターアカウント作成エラー:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "予期しないエラーが発生しました",
      password: null,
    };
  }
}

// ランダムパスワード生成
function generateRandomPassword(length: number = 12): string {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

