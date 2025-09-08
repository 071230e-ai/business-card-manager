-- 名刺管理テーブル
CREATE TABLE IF NOT EXISTS business_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  person_name TEXT NOT NULL,
  person_name_kana TEXT,
  department TEXT,
  position TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  fax TEXT,
  postal_code TEXT,
  address TEXT,
  website TEXT,
  notes TEXT,
  image_url TEXT,
  image_filename TEXT,
  registered_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 検索用インデックス
CREATE INDEX IF NOT EXISTS idx_business_cards_company_name ON business_cards(company_name);
CREATE INDEX IF NOT EXISTS idx_business_cards_person_name ON business_cards(person_name);
CREATE INDEX IF NOT EXISTS idx_business_cards_email ON business_cards(email);
CREATE INDEX IF NOT EXISTS idx_business_cards_created_at ON business_cards(created_at);

-- 企業分類テーブル（オプション）
CREATE TABLE IF NOT EXISTS company_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#3B82F6',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 名刺とカテゴリの関連テーブル
CREATE TABLE IF NOT EXISTS business_card_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_card_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_card_id) REFERENCES business_cards(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES company_categories(id) ON DELETE CASCADE,
  UNIQUE(business_card_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_business_card_categories_card_id ON business_card_categories(business_card_id);
CREATE INDEX IF NOT EXISTS idx_business_card_categories_category_id ON business_card_categories(category_id);