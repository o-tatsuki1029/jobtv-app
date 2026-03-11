-- メールテンプレート内の "JobTV" を "JOBTV" に統一する

UPDATE email_templates
SET
  subject   = REPLACE(subject,   'JobTV', 'JOBTV'),
  body_html = REPLACE(body_html, 'JobTV', 'JOBTV'),
  body_text = REPLACE(body_text, 'JobTV', 'JOBTV'),
  updated_at = now();
