-- 開発環境用の画像保存テーブル
CREATE TABLE IF NOT EXISTS business_card_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT UNIQUE NOT NULL,
  data_url TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_business_card_images_filename ON business_card_images(filename);
CREATE INDEX IF NOT EXISTS idx_business_card_images_created_at ON business_card_images(created_at);