-- イベント予約関連メールテンプレートの追加
INSERT INTO email_templates (name, subject, body_html, body_text, is_active) VALUES
(
  'event_reservation_confirmation',
  '【JOBTV】イベント予約が完了しました',
  '<h2>イベント予約完了</h2>
<p>{last_name} {first_name} 様</p>
<p>以下のイベントへのご予約が完了しました。</p>
<table style="border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">イベント</td><td style="padding:4px 0;">{event_type_name}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">日程</td><td style="padding:4px 0;">{event_date}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">時間</td><td style="padding:4px 0;">{start_time} 〜 {end_time}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">会場</td><td style="padding:4px 0;">{venue_name}</td></tr>
</table>
<p>当日お会いできることを楽しみにしております。</p>
<hr>
<p style="font-size:12px;color:#888;"><a href="{site_url}">JOBTV</a></p>',
  '{last_name} {first_name} 様

以下のイベントへのご予約が完了しました。

イベント: {event_type_name}
日程: {event_date}
時間: {start_time} 〜 {end_time}
会場: {venue_name}

当日お会いできることを楽しみにしております。

---
JOBTV {site_url}',
  true
),
(
  'event_reservation_reminder_7d',
  '【JOBTV】イベントまであと7日です',
  '<h2>イベントリマインド（7日前）</h2>
<p>{last_name} {first_name} 様</p>
<p>ご予約いただいたイベントまであと<strong>7日</strong>です。</p>
<table style="border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">イベント</td><td style="padding:4px 0;">{event_type_name}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">日程</td><td style="padding:4px 0;">{event_date}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">時間</td><td style="padding:4px 0;">{start_time} 〜 {end_time}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">会場</td><td style="padding:4px 0;">{venue_name}</td></tr>
</table>
<p>当日お会いできることを楽しみにしております。</p>
<hr>
<p style="font-size:12px;color:#888;"><a href="{site_url}">JOBTV</a></p>',
  '{last_name} {first_name} 様

ご予約いただいたイベントまであと7日です。

イベント: {event_type_name}
日程: {event_date}
時間: {start_time} 〜 {end_time}
会場: {venue_name}

当日お会いできることを楽しみにしております。

---
JOBTV {site_url}',
  true
),
(
  'event_reservation_reminder_3d',
  '【JOBTV】イベントまであと3日です',
  '<h2>イベントリマインド（3日前）</h2>
<p>{last_name} {first_name} 様</p>
<p>ご予約いただいたイベントまであと<strong>3日</strong>です。</p>
<table style="border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">イベント</td><td style="padding:4px 0;">{event_type_name}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">日程</td><td style="padding:4px 0;">{event_date}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">時間</td><td style="padding:4px 0;">{start_time} 〜 {end_time}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">会場</td><td style="padding:4px 0;">{venue_name}</td></tr>
</table>
<p>ご準備をお願いいたします。</p>
<hr>
<p style="font-size:12px;color:#888;"><a href="{site_url}">JOBTV</a></p>',
  '{last_name} {first_name} 様

ご予約いただいたイベントまであと3日です。

イベント: {event_type_name}
日程: {event_date}
時間: {start_time} 〜 {end_time}
会場: {venue_name}

ご準備をお願いいたします。

---
JOBTV {site_url}',
  true
),
(
  'event_reservation_reminder_1d',
  '【JOBTV】イベントはいよいよ明日です',
  '<h2>イベントリマインド（前日）</h2>
<p>{last_name} {first_name} 様</p>
<p>ご予約いただいたイベントはいよいよ<strong>明日</strong>です。</p>
<table style="border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">イベント</td><td style="padding:4px 0;">{event_type_name}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">日程</td><td style="padding:4px 0;">{event_date}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">時間</td><td style="padding:4px 0;">{start_time} 〜 {end_time}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">会場</td><td style="padding:4px 0;">{venue_name}</td></tr>
</table>
<p>お忘れ物のないようお気をつけてお越しください。お会いできるのを楽しみにしております！</p>
<hr>
<p style="font-size:12px;color:#888;"><a href="{site_url}">JOBTV</a></p>',
  '{last_name} {first_name} 様

ご予約いただいたイベントはいよいよ明日です。

イベント: {event_type_name}
日程: {event_date}
時間: {start_time} 〜 {end_time}
会場: {venue_name}

お忘れ物のないようお気をつけてお越しください。お会いできるのを楽しみにしております！

---
JOBTV {site_url}',
  true
)
ON CONFLICT (name) DO NOTHING;
