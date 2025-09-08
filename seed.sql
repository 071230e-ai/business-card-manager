-- サンプル企業カテゴリ
INSERT OR IGNORE INTO company_categories (name, color) VALUES 
  ('取引先', '#3B82F6'),
  ('顧客', '#10B981'),
  ('パートナー', '#F59E0B'),
  ('競合他社', '#EF4444'),
  ('その他', '#6B7280');

-- サンプル名刺データ
INSERT OR IGNORE INTO business_cards (
  company_name, person_name, person_name_kana, department, position, 
  email, phone, address, registered_by, notes
) VALUES 
  (
    'ソフトウェア開発株式会社', '田中太郎', 'タナカタロウ', '営業部', '部長',
    'tanaka@software-dev.co.jp', '03-1234-5678', 
    '東京都千代田区大手町1-1-1', 'admin', 
    'システム開発の件で定期的に連絡を取っている'
  ),
  (
    '株式会社マーケティング', '佐藤花子', 'サトウハナコ', 'マーケティング部', '課長',
    'sato@marketing.co.jp', '03-9876-5432',
    '東京都渋谷区渋谷2-2-2', 'admin',
    'デジタルマーケティングの専門家'
  ),
  (
    'テクノロジー合同会社', '鈴木次郎', 'スズキジロウ', '技術部', 'シニアエンジニア',
    'suzuki@technology-llc.com', '03-5555-1111',
    '東京都品川区大崎3-3-3', 'admin',
    'AI・機械学習の技術相談で協力いただいている'
  );

-- カテゴリの関連付け
INSERT OR IGNORE INTO business_card_categories (business_card_id, category_id)
SELECT bc.id, cc.id 
FROM business_cards bc, company_categories cc 
WHERE bc.company_name = 'ソフトウェア開発株式会社' AND cc.name = '取引先';

INSERT OR IGNORE INTO business_card_categories (business_card_id, category_id)
SELECT bc.id, cc.id 
FROM business_cards bc, company_categories cc 
WHERE bc.company_name = '株式会社マーケティング' AND cc.name = '顧客';

INSERT OR IGNORE INTO business_card_categories (business_card_id, category_id)
SELECT bc.id, cc.id 
FROM business_cards bc, company_categories cc 
WHERE bc.company_name = 'テクノロジー合同会社' AND cc.name = 'パートナー';