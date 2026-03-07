-- エントリー・予約通知メールテンプレートを追加

INSERT INTO public.email_templates (name, description, subject, body_html, body_text, variables)
VALUES
  (
    'job_application_notification',
    '候補者が求人にエントリーした際に企業リクルーターへ送る通知メール',
    '【JobTV】求人への新規エントリーのお知らせ',
    '<!DOCTYPE html>
<html lang="ja">
<body style="font-family: sans-serif; color: #222; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="border-bottom: 2px solid #e60000; padding-bottom: 8px;">求人への新規エントリーのお知らせ</h2>
  <p>{company_name} 採用ご担当者様</p>
  <p>JobTV より、求人への新規エントリーをお知らせします。</p>
  <table style="border-collapse: collapse; margin: 16px 0;">
    <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">エントリー候補者</td><td>{candidate_name}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; font-weight: bold; vertical-align: top;">応募求人</td><td style="white-space: pre-line;">{job_titles}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">エントリー日時</td><td>{applied_at}</td></tr>
  </table>
  <p>JobTV 管理画面からご確認ください。</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
  <p style="font-size:12px;color:#999;"><a href="{site_url}" style="color:#999;">JobTV</a></p>
</body>
</html>',
    '{company_name} 採用ご担当者様

JobTV より、求人への新規エントリーをお知らせします。

エントリー候補者: {candidate_name}
応募求人:
{job_titles}
エントリー日時: {applied_at}

JobTV 管理画面からご確認ください。

JobTV {site_url}',
    ARRAY['company_name', 'candidate_name', 'job_titles', 'applied_at', 'site_url']
  ),
  (
    'session_reservation_notification',
    '候補者が説明会に参加予約した際に企業リクルーターへ送る通知メール',
    '【JobTV】説明会への新規参加予約のお知らせ',
    '<!DOCTYPE html>
<html lang="ja">
<body style="font-family: sans-serif; color: #222; max-width: 600px; margin: 0 auto; padding: 24px;">
  <h2 style="border-bottom: 2px solid #e60000; padding-bottom: 8px;">説明会への新規参加予約のお知らせ</h2>
  <p>{company_name} 採用ご担当者様</p>
  <p>JobTV より、説明会への新規参加予約をお知らせします。</p>
  <table style="border-collapse: collapse; margin: 16px 0;">
    <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">予約候補者</td><td>{candidate_name}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">説明会</td><td>{session_title}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">日程</td><td>{event_date} {start_time}〜{end_time}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">予約日時</td><td>{reserved_at}</td></tr>
  </table>
  <p>JobTV 管理画面からご確認ください。</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
  <p style="font-size:12px;color:#999;"><a href="{site_url}" style="color:#999;">JobTV</a></p>
</body>
</html>',
    '{company_name} 採用ご担当者様

JobTV より、説明会への新規参加予約をお知らせします。

予約候補者: {candidate_name}
説明会: {session_title}
日程: {event_date} {start_time}〜{end_time}
予約日時: {reserved_at}

JobTV 管理画面からご確認ください。

JobTV {site_url}',
    ARRAY['company_name', 'candidate_name', 'session_title', 'event_date', 'start_time', 'end_time', 'reserved_at', 'site_url']
  )
ON CONFLICT (name) DO NOTHING;
