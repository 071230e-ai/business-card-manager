import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Bindings, ImageUploadResponse, ApiResponse } from '../types';

const app = new Hono<{ Bindings: Bindings }>();

// CORS設定
app.use('*', cors());

// 許可するファイル形式
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// 画像アップロード
app.post('/upload', async (c) => {
  try {
    const { R2, DB } = c.env;

    // R2が利用できない場合のフォールバック
    if (!R2) {
      const response: ImageUploadResponse = {
        success: false,
        error: 'R2ストレージが設定されていません。本番環境でのみ画像アップロードが利用できます。'
      };
      return c.json(response, 501);
    }
    
    // フォームデータを取得
    const formData = await c.req.formData();
    const file = formData.get('image') as File;
    const businessCardId = formData.get('businessCardId') as string;
    
    if (!file) {
      const response: ImageUploadResponse = {
        success: false,
        error: 'ファイルが選択されていません'
      };
      return c.json(response, 400);
    }

    // ファイル形式チェック
    if (!ALLOWED_TYPES.includes(file.type)) {
      const response: ImageUploadResponse = {
        success: false,
        error: '対応していないファイル形式です（JPEG、PNG、WebPのみ対応）'
      };
      return c.json(response, 400);
    }

    // ファイルサイズチェック
    if (file.size > MAX_FILE_SIZE) {
      const response: ImageUploadResponse = {
        success: false,
        error: 'ファイルサイズが大きすぎます（5MB以下にしてください）'
      };
      return c.json(response, 400);
    }

    // ファイル名生成（重複を避けるため）
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `business-card-${timestamp}-${randomId}.${extension}`;
    
    // R2にアップロード
    const arrayBuffer = await file.arrayBuffer();
    await R2.put(filename, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        businessCardId: businessCardId || '',
      },
    });

    // データベースの名刺情報を更新（businessCardIdが提供されている場合）
    if (businessCardId) {
      const imageUrl = `/api/images/${filename}`;
      await DB.prepare(`
        UPDATE business_cards 
        SET image_url = ?, image_filename = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(imageUrl, filename, businessCardId).run();
    }

    const response: ImageUploadResponse = {
      success: true,
      image_url: `/api/images/${filename}`,
      image_filename: filename
    };

    return c.json(response, 201);
  } catch (error) {
    console.error('Error uploading image:', error);
    const response: ImageUploadResponse = {
      success: false,
      error: 'ファイルのアップロードに失敗しました'
    };
    return c.json(response, 500);
  }
});

// 画像取得
app.get('/:filename', async (c) => {
  try {
    const { R2 } = c.env;
    const filename = c.req.param('filename');

    // R2が利用できない場合（ローカル開発環境）のフォールバック
    if (!R2) {
      return c.text('R2ストレージが設定されていません（本番環境でのみ利用可能）', 501);
    }

    const object = await R2.get(filename);
    if (!object) {
      return c.notFound();
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('cache-control', 'public, max-age=31536000'); // 1年キャッシュ

    return new Response(object.body, { headers });
  } catch (error) {
    console.error('Error retrieving image:', error);
    return c.text('画像の取得に失敗しました', 500);
  }
});

// 画像削除
app.delete('/:filename', async (c) => {
  try {
    const { R2, DB } = c.env;
    const filename = c.req.param('filename');

    if (!R2) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'R2ストレージが設定されていません'
      };
      return c.json(response, 501);
    }

    // R2から削除
    await R2.delete(filename);

    // データベースの画像情報をクリア
    await DB.prepare(`
      UPDATE business_cards 
      SET image_url = NULL, image_filename = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE image_filename = ?
    `).bind(filename).run();

    const response: ApiResponse<null> = {
      success: true,
      data: null
    };

    return c.json(response);
  } catch (error) {
    console.error('Error deleting image:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: '画像の削除に失敗しました'
    };
    return c.json(response, 500);
  }
});

// 画像リスト取得（管理用）
app.get('/', async (c) => {
  try {
    const { R2 } = c.env;
    
    if (!R2) {
      const response: ApiResponse<any[]> = {
        success: true,
        data: [],
        total: 0
      };
      return c.json(response);
    }
    
    const list = await R2.list({ limit: 100 });
    const images = list.objects.map(obj => ({
      filename: obj.key,
      size: obj.size,
      uploaded: obj.uploaded,
      url: `/api/images/${obj.key}`
    }));

    const response: ApiResponse<typeof images> = {
      success: true,
      data: images,
      total: images.length
    };

    return c.json(response);
  } catch (error) {
    console.error('Error listing images:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: '画像リストの取得に失敗しました'
    };
    return c.json(response, 500);
  }
});

export default app;