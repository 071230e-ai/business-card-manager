import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Bindings, CompanyCategory, ApiResponse } from '../types';

const app = new Hono<{ Bindings: Bindings }>();

// CORS設定
app.use('*', cors());

// カテゴリ一覧取得
app.get('/', async (c) => {
  try {
    const { DB } = c.env;
    
    const { results } = await DB.prepare(`
      SELECT * FROM company_categories ORDER BY name ASC
    `).all();

    const response: ApiResponse<CompanyCategory[]> = {
      success: true,
      data: results
    };

    return c.json(response);
  } catch (error) {
    console.error('Error fetching categories:', error);
    const response: ApiResponse<CompanyCategory[]> = {
      success: false,
      error: 'Failed to fetch categories'
    };
    return c.json(response, 500);
  }
});

// カテゴリ新規作成
app.post('/', async (c) => {
  try {
    const { DB } = c.env;
    const categoryData: CompanyCategory = await c.req.json();

    if (!categoryData.name) {
      const response: ApiResponse<CompanyCategory> = {
        success: false,
        error: 'Category name is required'
      };
      return c.json(response, 400);
    }

    const result = await DB.prepare(`
      INSERT INTO company_categories (name, color) VALUES (?, ?)
    `).bind(categoryData.name, categoryData.color || '#3B82F6').run();

    if (!result.success) {
      const response: ApiResponse<CompanyCategory> = {
        success: false,
        error: 'Failed to create category'
      };
      return c.json(response, 500);
    }

    const newCategory = await DB.prepare(`
      SELECT * FROM company_categories WHERE id = ?
    `).bind(result.meta.last_row_id).first();

    const response: ApiResponse<CompanyCategory> = {
      success: true,
      data: newCategory
    };

    return c.json(response, 201);
  } catch (error) {
    console.error('Error creating category:', error);
    const response: ApiResponse<CompanyCategory> = {
      success: false,
      error: 'Failed to create category'
    };
    return c.json(response, 500);
  }
});

// 名刺にカテゴリを関連付け
app.post('/:categoryId/business-cards/:businessCardId', async (c) => {
  try {
    const { DB } = c.env;
    const categoryId = c.req.param('categoryId');
    const businessCardId = c.req.param('businessCardId');

    const result = await DB.prepare(`
      INSERT OR IGNORE INTO business_card_categories (business_card_id, category_id)
      VALUES (?, ?)
    `).bind(businessCardId, categoryId).run();

    const response: ApiResponse<null> = {
      success: true,
      data: null
    };

    return c.json(response);
  } catch (error) {
    console.error('Error linking category to business card:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to link category to business card'
    };
    return c.json(response, 500);
  }
});

// 名刺からカテゴリの関連付けを削除
app.delete('/:categoryId/business-cards/:businessCardId', async (c) => {
  try {
    const { DB } = c.env;
    const categoryId = c.req.param('categoryId');
    const businessCardId = c.req.param('businessCardId');

    await DB.prepare(`
      DELETE FROM business_card_categories 
      WHERE business_card_id = ? AND category_id = ?
    `).bind(businessCardId, categoryId).run();

    const response: ApiResponse<null> = {
      success: true,
      data: null
    };

    return c.json(response);
  } catch (error) {
    console.error('Error unlinking category from business card:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to unlink category from business card'
    };
    return c.json(response, 500);
  }
});

export default app;