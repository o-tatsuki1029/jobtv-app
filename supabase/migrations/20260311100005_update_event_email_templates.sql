-- 既存イベント予約メールテンプレートに集合時間・住所・マップURLプレースホルダを追加

-- 予約確認メール
UPDATE email_templates SET
  body_html = '<h2>イベント予約完了</h2>
<p>{last_name} {first_name} 様</p>
<p>以下のイベントへのご予約が完了しました。</p>
<table style="border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">イベント</td><td style="padding:4px 0;">{event_type_name}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">日程</td><td style="padding:4px 0;">{event_date}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">時間</td><td style="padding:4px 0;">{start_time} 〜 {end_time}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">集合時間</td><td style="padding:4px 0;">{gathering_time}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">会場</td><td style="padding:4px 0;">{venue_name}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">住所</td><td style="padding:4px 0;">{venue_address}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">地図</td><td style="padding:4px 0;"><a href="{google_maps_url}">{google_maps_url}</a></td></tr>
</table>
<p>当日お会いできることを楽しみにしております。</p>
<hr>
<p style="font-size:12px;color:#888;"><a href="{site_url}">JOBTV</a></p>',
  body_text = '{last_name} {first_name} 様

以下のイベントへのご予約が完了しました。

イベント: {event_type_name}
日程: {event_date}
時間: {start_time} 〜 {end_time}
集合時間: {gathering_time}
会場: {venue_name}
住所: {venue_address}
地図: {google_maps_url}

当日お会いできることを楽しみにしております。

---
JOBTV {site_url}'
WHERE name = 'event_reservation_confirmation';

-- リマインド7日前
UPDATE email_templates SET
  body_html = '<h2>イベントリマインド（7日前）</h2>
<p>{last_name} {first_name} 様</p>
<p>ご予約いただいたイベントまであと<strong>7日</strong>です。</p>
<table style="border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">イベント</td><td style="padding:4px 0;">{event_type_name}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">日程</td><td style="padding:4px 0;">{event_date}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">時間</td><td style="padding:4px 0;">{start_time} 〜 {end_time}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">集合時間</td><td style="padding:4px 0;">{gathering_time}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">会場</td><td style="padding:4px 0;">{venue_name}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">住所</td><td style="padding:4px 0;">{venue_address}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">地図</td><td style="padding:4px 0;"><a href="{google_maps_url}">{google_maps_url}</a></td></tr>
</table>
<p>当日お会いできることを楽しみにしております。</p>
<hr>
<p style="font-size:12px;color:#888;"><a href="{site_url}">JOBTV</a></p>',
  body_text = '{last_name} {first_name} 様

ご予約いただいたイベントまであと7日です。

イベント: {event_type_name}
日程: {event_date}
時間: {start_time} 〜 {end_time}
集合時間: {gathering_time}
会場: {venue_name}
住所: {venue_address}
地図: {google_maps_url}

当日お会いできることを楽しみにしております。

---
JOBTV {site_url}'
WHERE name = 'event_reservation_reminder_7d';

-- リマインド3日前
UPDATE email_templates SET
  body_html = '<h2>イベントリマインド（3日前）</h2>
<p>{last_name} {first_name} 様</p>
<p>ご予約いただいたイベントまであと<strong>3日</strong>です。</p>
<table style="border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">イベント</td><td style="padding:4px 0;">{event_type_name}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">日程</td><td style="padding:4px 0;">{event_date}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">時間</td><td style="padding:4px 0;">{start_time} 〜 {end_time}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">集合時間</td><td style="padding:4px 0;">{gathering_time}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">会場</td><td style="padding:4px 0;">{venue_name}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">住所</td><td style="padding:4px 0;">{venue_address}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">地図</td><td style="padding:4px 0;"><a href="{google_maps_url}">{google_maps_url}</a></td></tr>
</table>
<p>ご準備をお願いいたします。</p>
<hr>
<p style="font-size:12px;color:#888;"><a href="{site_url}">JOBTV</a></p>',
  body_text = '{last_name} {first_name} 様

ご予約いただいたイベントまであと3日です。

イベント: {event_type_name}
日程: {event_date}
時間: {start_time} 〜 {end_time}
集合時間: {gathering_time}
会場: {venue_name}
住所: {venue_address}
地図: {google_maps_url}

ご準備をお願いいたします。

---
JOBTV {site_url}'
WHERE name = 'event_reservation_reminder_3d';

-- リマインド前日
UPDATE email_templates SET
  body_html = '<h2>イベントリマインド（前日）</h2>
<p>{last_name} {first_name} 様</p>
<p>ご予約いただいたイベントはいよいよ<strong>明日</strong>です。</p>
<table style="border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">イベント</td><td style="padding:4px 0;">{event_type_name}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">日程</td><td style="padding:4px 0;">{event_date}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">時間</td><td style="padding:4px 0;">{start_time} 〜 {end_time}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">集合時間</td><td style="padding:4px 0;">{gathering_time}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">会場</td><td style="padding:4px 0;">{venue_name}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">住所</td><td style="padding:4px 0;">{venue_address}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">地図</td><td style="padding:4px 0;"><a href="{google_maps_url}">{google_maps_url}</a></td></tr>
</table>
<p>お忘れ物のないようお気をつけてお越しください。お会いできるのを楽しみにしております！</p>
<hr>
<p style="font-size:12px;color:#888;"><a href="{site_url}">JOBTV</a></p>',
  body_text = '{last_name} {first_name} 様

ご予約いただいたイベントはいよいよ明日です。

イベント: {event_type_name}
日程: {event_date}
時間: {start_time} 〜 {end_time}
集合時間: {gathering_time}
会場: {venue_name}
住所: {venue_address}
地図: {google_maps_url}

お忘れ物のないようお気をつけてお越しください。お会いできるのを楽しみにしております！

---
JOBTV {site_url}'
WHERE name = 'event_reservation_reminder_1d';
