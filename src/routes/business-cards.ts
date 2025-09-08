import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Bindings, BusinessCard, BusinessCardSearchParams, ApiResponse, BusinessCardWithCategories } from '../types';

const app = new Hono<{ Bindings: Bindings }>();

// CORS設定
app.use('*', cors());

// 名刺一覧取得（検索・フィルタ機能付き）
app.get('/', async (c) => {
  try {
    const { DB } = c.env;
    const searchParams: BusinessCardSearchParams = {
      q: c.req.query('q'),
      company_name: c.req.query('company_name'),
      person_name: c.req.query('person_name'),
      category: c.req.query('category'),
      limit: Number(c.req.query('limit')) || 20,
      offset: Number(c.req.query('offset')) || 0,
    };

    let query = `
      SELECT DISTINCT bc.*, 
             GROUP_CONCAT(cc.name) as category_names,
             GROUP_CONCAT(cc.color) as category_colors
      FROM business_cards bc
      LEFT JOIN business_card_categories bcc ON bc.id = bcc.business_card_id
      LEFT JOIN company_categories cc ON bcc.category_id = cc.id
    `;
    
    const conditions: string[] = [];
    const params: any[] = [];

    // 検索条件の構築
    if (searchParams.q) {
      conditions.push(`(bc.company_name LIKE ? OR bc.person_name LIKE ? OR bc.email LIKE ?)`);
      const searchTerm = `%${searchParams.q}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (searchParams.company_name) {
      conditions.push(`bc.company_name LIKE ?`);
      params.push(`%${searchParams.company_name}%`);
    }

    if (searchParams.person_name) {
      conditions.push(`bc.person_name LIKE ?`);
      params.push(`%${searchParams.person_name}%`);
    }

    if (searchParams.category) {
      conditions.push(`cc.name = ?`);
      params.push(searchParams.category);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` GROUP BY bc.id ORDER BY bc.created_at DESC LIMIT ? OFFSET ?`;
    params.push(searchParams.limit, searchParams.offset);

    const { results } = await DB.prepare(query).bind(...params).all();

    // カテゴリ情報を整形
    const businessCards: BusinessCardWithCategories[] = results.map((card: any) => {
      const categories = [];
      if (card.category_names) {
        const names = card.category_names.split(',');
        const colors = card.category_colors.split(',');
        for (let i = 0; i < names.length; i++) {
          categories.push({
            name: names[i],
            color: colors[i]
          });
        }
      }

      const { category_names, category_colors, ...cardData } = card;
      return {
        ...cardData,
        categories
      };
    });

    // 総件数取得
    let countQuery = `SELECT COUNT(DISTINCT bc.id) as total FROM business_cards bc`;
    if (searchParams.category) {
      countQuery += ` 
        LEFT JOIN business_card_categories bcc ON bc.id = bcc.business_card_id
        LEFT JOIN company_categories cc ON bcc.category_id = cc.id
      `;
    }

    const countConditions: string[] = [];
    const countParams: any[] = [];

    if (searchParams.q) {
      countConditions.push(`(bc.company_name LIKE ? OR bc.person_name LIKE ? OR bc.email LIKE ?)`);
      const searchTerm = `%${searchParams.q}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (searchParams.company_name) {
      countConditions.push(`bc.company_name LIKE ?`);
      countParams.push(`%${searchParams.company_name}%`);
    }

    if (searchParams.person_name) {
      countConditions.push(`bc.person_name LIKE ?`);
      countParams.push(`%${searchParams.person_name}%`);
    }

    if (searchParams.category) {
      countConditions.push(`cc.name = ?`);
      countParams.push(searchParams.category);
    }

    if (countConditions.length > 0) {
      countQuery += ` WHERE ${countConditions.join(' AND ')}`;
    }

    const countResult = await DB.prepare(countQuery).bind(...countParams).first();
    const total = countResult?.total || 0;

    const response: ApiResponse<BusinessCardWithCategories[]> = {
      success: true,
      data: businessCards,
      total: total
    };

    return c.json(response);
  } catch (error) {
    console.error('Error fetching business cards:', error);
    const response: ApiResponse<BusinessCardWithCategories[]> = {
      success: false,
      error: 'Failed to fetch business cards'
    };
    return c.json(response, 500);
  }
});

// 名刺詳細取得
app.get('/:id', async (c) => {
  try {
    const { DB } = c.env;
    const id = c.req.param('id');

    const card = await DB.prepare(`
      SELECT * FROM business_cards WHERE id = ?
    `).bind(id).first();

    if (!card) {
      const response: ApiResponse<BusinessCard> = {
        success: false,
        error: 'Business card not found'
      };
      return c.json(response, 404);
    }

    // カテゴリ情報取得
    const { results: categories } = await DB.prepare(`
      SELECT cc.* FROM company_categories cc
      JOIN business_card_categories bcc ON cc.id = bcc.category_id
      WHERE bcc.business_card_id = ?
    `).bind(id).all();

    const businessCard: BusinessCardWithCategories = {
      ...card,
      categories: categories
    };

    const response: ApiResponse<BusinessCardWithCategories> = {
      success: true,
      data: businessCard
    };

    return c.json(response);
  } catch (error) {
    console.error('Error fetching business card:', error);
    const response: ApiResponse<BusinessCard> = {
      success: false,
      error: 'Failed to fetch business card'
    };
    return c.json(response, 500);
  }
});

// 名刺新規登録
app.post('/', async (c) => {
  try {
    const { DB } = c.env;
    const cardData: BusinessCard = await c.req.json();

    // 必須フィールドの検証
    if (!cardData.company_name || !cardData.person_name) {
      const response: ApiResponse<BusinessCard> = {
        success: false,
        error: 'Company name and person name are required'
      };
      return c.json(response, 400);
    }

    // 名刺データ挿入
    const result = await DB.prepare(`
      INSERT INTO business_cards (
        company_name, person_name, person_name_kana, department, position,
        email, phone, mobile, fax, postal_code, address, website, notes,
        registered_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      cardData.company_name,
      cardData.person_name,
      cardData.person_name_kana || null,
      cardData.department || null,
      cardData.position || null,
      cardData.email || null,
      cardData.phone || null,
      cardData.mobile || null,
      cardData.fax || null,
      cardData.postal_code || null,
      cardData.address || null,
      cardData.website || null,
      cardData.notes || null,
      cardData.registered_by || 'anonymous'
    ).run();

    if (!result.success) {
      const response: ApiResponse<BusinessCard> = {
        success: false,
        error: 'Failed to create business card'
      };
      return c.json(response, 500);
    }

    // 作成されたデータを取得
    const newCard = await DB.prepare(`
      SELECT * FROM business_cards WHERE id = ?
    `).bind(result.meta.last_row_id).first();

    const response: ApiResponse<BusinessCard> = {
      success: true,
      data: newCard
    };

    return c.json(response, 201);
  } catch (error) {
    console.error('Error creating business card:', error);
    const response: ApiResponse<BusinessCard> = {
      success: false,
      error: 'Failed to create business card'
    };
    return c.json(response, 500);
  }
});

// 名刺更新
app.put('/:id', async (c) => {
  try {
    const { DB } = c.env;
    const id = c.req.param('id');
    const cardData: BusinessCard = await c.req.json();

    // 既存データの確認
    const existing = await DB.prepare(`
      SELECT * FROM business_cards WHERE id = ?
    `).bind(id).first();

    if (!existing) {
      const response: ApiResponse<BusinessCard> = {
        success: false,
        error: 'Business card not found'
      };
      return c.json(response, 404);
    }

    // データ更新
    const result = await DB.prepare(`
      UPDATE business_cards SET
        company_name = ?, person_name = ?, person_name_kana = ?, 
        department = ?, position = ?, email = ?, phone = ?, mobile = ?,
        fax = ?, postal_code = ?, address = ?, website = ?, notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      cardData.company_name,
      cardData.person_name,
      cardData.person_name_kana || null,
      cardData.department || null,
      cardData.position || null,
      cardData.email || null,
      cardData.phone || null,
      cardData.mobile || null,
      cardData.fax || null,
      cardData.postal_code || null,
      cardData.address || null,
      cardData.website || null,
      cardData.notes || null,
      id
    ).run();

    if (!result.success) {
      const response: ApiResponse<BusinessCard> = {
        success: false,
        error: 'Failed to update business card'
      };
      return c.json(response, 500);
    }

    // 更新されたデータを取得
    const updatedCard = await DB.prepare(`
      SELECT * FROM business_cards WHERE id = ?
    `).bind(id).first();

    const response: ApiResponse<BusinessCard> = {
      success: true,
      data: updatedCard
    };

    return c.json(response);
  } catch (error) {
    console.error('Error updating business card:', error);
    const response: ApiResponse<BusinessCard> = {
      success: false,
      error: 'Failed to update business card'
    };
    return c.json(response, 500);
  }
});

// 名刺削除
app.delete('/:id', async (c) => {
  try {
    const { DB } = c.env;
    const id = c.req.param('id');

    // 既存データの確認
    const existing = await DB.prepare(`
      SELECT * FROM business_cards WHERE id = ?
    `).bind(id).first();

    if (!existing) {
      const response: ApiResponse<BusinessCard> = {
        success: false,
        error: 'Business card not found'
      };
      return c.json(response, 404);
    }

    // カテゴリ関連データ削除
    await DB.prepare(`
      DELETE FROM business_card_categories WHERE business_card_id = ?
    `).bind(id).run();

    // 名刺データ削除
    const result = await DB.prepare(`
      DELETE FROM business_cards WHERE id = ?
    `).bind(id).run();

    if (!result.success) {
      const response: ApiResponse<BusinessCard> = {
        success: false,
        error: 'Failed to delete business card'
      };
      return c.json(response, 500);
    }

    const response: ApiResponse<null> = {
      success: true,
      data: null
    };

    return c.json(response);
  } catch (error) {
    console.error('Error deleting business card:', error);
    const response: ApiResponse<BusinessCard> = {
      success: false,
      error: 'Failed to delete business card'
    };
    return c.json(response, 500);
  }
});

export default app;