import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import type { Bindings } from './types'

// ルートのインポート
import businessCardsRoutes from './routes/business-cards'
import categoriesRoutes from './routes/categories'
import imagesRoutes from './routes/images'

const app = new Hono<{ Bindings: Bindings }>()

// CORS設定
app.use('/api/*', cors())

// 静的ファイル配信
app.use('/static/*', serveStatic({ root: './public' }))

// APIルート
app.route('/api/business-cards', businessCardsRoutes)
app.route('/api/categories', categoriesRoutes)
app.route('/api/images', imagesRoutes)

// ヘルスチェック
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// メイン画面
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>名刺管理システム</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            body {
                font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif;
            }
        </style>
    </head>
    <body class="bg-gray-50">
        <div class="container mx-auto px-4 py-8">
            <!-- ヘッダー -->
            <header class="bg-white shadow rounded-lg p-6 mb-6">
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <i class="fas fa-id-card text-blue-600 text-3xl mr-4"></i>
                        <div>
                            <h1 class="text-3xl font-bold text-gray-800">名刺管理システム</h1>
                            <p class="text-gray-600 mt-1">社内での取引先情報を効率的に管理・共有</p>
                        </div>
                    </div>
                    <button 
                        id="add-card-btn" 
                        class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition duration-200 flex items-center"
                    >
                        <i class="fas fa-plus mr-2"></i>
                        新規登録
                    </button>
                </div>
            </header>

            <!-- 検索・フィルタバー -->
            <div class="bg-white shadow rounded-lg p-6 mb-6">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">キーワード検索</label>
                        <input 
                            type="text" 
                            id="search-input" 
                            placeholder="会社名、担当者名、メールアドレス" 
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">会社名</label>
                        <input 
                            type="text" 
                            id="company-filter" 
                            placeholder="会社名で絞り込み" 
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">カテゴリ</label>
                        <select 
                            id="category-filter" 
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">全て</option>
                        </select>
                    </div>
                    <div class="flex items-end">
                        <button 
                            id="clear-filters-btn" 
                            class="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition duration-200"
                        >
                            <i class="fas fa-eraser mr-2"></i>
                            クリア
                        </button>
                    </div>
                </div>
            </div>

            <!-- 名刺一覧 -->
            <div class="bg-white shadow rounded-lg">
                <div class="p-6 border-b border-gray-200">
                    <div class="flex items-center justify-between">
                        <h2 class="text-xl font-semibold text-gray-800">
                            <i class="fas fa-list mr-2"></i>
                            名刺一覧
                        </h2>
                        <span id="total-count" class="text-gray-500 text-sm">0件</span>
                    </div>
                </div>
                
                <div id="cards-container" class="divide-y divide-gray-200">
                    <!-- 名刺一覧がここに表示されます -->
                </div>

                <div id="loading" class="p-8 text-center text-gray-500 hidden">
                    <i class="fas fa-spinner fa-spin text-2xl"></i>
                    <p class="mt-2">読み込み中...</p>
                </div>

                <div id="no-results" class="p-8 text-center text-gray-500 hidden">
                    <i class="fas fa-search text-4xl mb-4"></i>
                    <p class="text-lg">該当する名刺が見つかりませんでした</p>
                </div>
            </div>

            <!-- ページネーション -->
            <div id="pagination" class="mt-6 flex justify-center">
                <!-- ページネーションがここに表示されます -->
            </div>
        </div>

        <!-- モーダル：名刺詳細・編集 -->
        <div id="card-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
            <div class="flex items-center justify-center min-h-screen p-4">
                <div class="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
                    <div class="p-6">
                        <div class="flex items-center justify-between mb-6">
                            <h3 id="modal-title" class="text-2xl font-bold text-gray-800">名刺詳細</h3>
                            <button id="close-modal" class="text-gray-400 hover:text-gray-600">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>

                        <form id="card-form" class="space-y-4">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">会社名 *</label>
                                    <input type="text" name="company_name" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">担当者名 *</label>
                                    <input type="text" name="person_name" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">ふりがな</label>
                                    <input type="text" name="person_name_kana" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">部署</label>
                                    <input type="text" name="department" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">役職</label>
                                    <input type="text" name="position" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                                    <input type="email" name="email" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
                                    <input type="tel" name="phone" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">携帯番号</label>
                                    <input type="tel" name="mobile" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">FAX</label>
                                    <input type="tel" name="fax" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">郵便番号</label>
                                    <input type="text" name="postal_code" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                <div class="md:col-span-3">
                                    <label class="block text-sm font-medium text-gray-700 mb-1">住所</label>
                                    <input type="text" name="address" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Webサイト</label>
                                <input type="url" name="website" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">備考</label>
                                <textarea name="notes" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                            </div>

                            <!-- 名刺画像セクション -->
                            <div class="space-y-4">
                                <label class="block text-sm font-medium text-gray-700">名刺画像</label>
                                
                                <!-- 既存画像表示 -->
                                <div id="current-image-container" class="hidden">
                                    <div class="relative inline-block">
                                        <img id="current-image" src="" alt="現在の名刺画像" class="max-w-full h-48 object-contain border rounded-lg">
                                        <button type="button" id="remove-image-btn" class="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition duration-200">
                                            <i class="fas fa-times text-sm"></i>
                                        </button>
                                    </div>
                                </div>

                                <!-- 画像アップロードエリア -->
                                <div id="image-upload-area" class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition duration-200">
                                    <div class="space-y-4">
                                        <div class="flex justify-center space-x-4">
                                            <button type="button" id="file-upload-btn" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200 flex items-center">
                                                <i class="fas fa-upload mr-2"></i>
                                                ファイル選択
                                            </button>
                                            <button type="button" id="camera-btn" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition duration-200 flex items-center">
                                                <i class="fas fa-camera mr-2"></i>
                                                カメラで撮影
                                            </button>
                                        </div>
                                        <p class="text-sm text-gray-500">
                                            JPEG、PNG、WebP形式（最大5MB）
                                        </p>
                                    </div>
                                    
                                    <input type="file" id="image-file-input" accept="image/jpeg,image/jpg,image/png,image/webp" class="hidden">
                                </div>

                                <!-- カメラプレビュー -->
                                <div id="camera-container" class="hidden space-y-4">
                                    <div class="relative">
                                        <video id="camera-video" class="w-full h-64 object-cover bg-black rounded-lg"></video>
                                        <canvas id="camera-canvas" class="hidden"></canvas>
                                        <div class="absolute inset-0 border-2 border-white rounded-lg pointer-events-none opacity-50"></div>
                                    </div>
                                    <div class="flex justify-center space-x-4">
                                        <button type="button" id="capture-btn" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition duration-200 flex items-center">
                                            <i class="fas fa-camera mr-2"></i>
                                            撮影
                                        </button>
                                        <button type="button" id="cancel-camera-btn" class="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition duration-200">
                                            キャンセル
                                        </button>
                                    </div>
                                </div>

                                <!-- アップロード進捗 -->
                                <div id="upload-progress" class="hidden">
                                    <div class="flex items-center space-x-3">
                                        <i class="fas fa-spinner fa-spin text-blue-600"></i>
                                        <span class="text-sm text-gray-600">画像をアップロード中...</span>
                                    </div>
                                    <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
                                        <div id="progress-bar" class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                                    </div>
                                </div>
                            </div>

                            <div class="flex justify-end space-x-4 pt-6">
                                <button type="button" id="cancel-btn" class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition duration-200">
                                    キャンセル
                                </button>
                                <button type="button" id="delete-btn" class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-200 hidden">
                                    <i class="fas fa-trash mr-2"></i>
                                    削除
                                </button>
                                <button type="submit" id="save-btn" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200">
                                    <i class="fas fa-save mr-2"></i>
                                    保存
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <!-- 通知エリア -->
        <div id="notification-container" class="fixed top-4 right-4 z-50 space-y-2"></div>

        <!-- JavaScript -->
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app