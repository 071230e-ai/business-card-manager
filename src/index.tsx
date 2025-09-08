import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import businessCardsRoutes from './routes/business-cards'
import categoriesRoutes from './routes/categories'
import imagesRoutes from './routes/images'
import type { CloudflareBindings } from './types'

const app = new Hono<{ Bindings: CloudflareBindings }>()

// Enable CORS for frontend-backend communication
app.use('/api/*', cors())

// Serve static files from public directory
app.use('/static/*', serveStatic({ root: './public' }))

// API routes
app.route('/api/business-cards', businessCardsRoutes)
app.route('/api/categories', categoriesRoutes)
app.route('/api/images', imagesRoutes)

// Default route with comprehensive UI
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
            .toast {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                min-width: 300px;
                max-width: 90vw;
                padding: 12px 16px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                opacity: 0;
                transform: translateX(400px);
                transition: all 0.3s ease;
            }
            .toast.show {
                opacity: 1;
                transform: translateX(0);
            }
            .toast.success { background-color: #10b981; }
            .toast.error { background-color: #ef4444; }
            .toast.warning { background-color: #f59e0b; }
            .toast.info { background-color: #3b82f6; }

            .modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
                padding: 1rem;
            }
            .modal.show {
                opacity: 1;
                visibility: visible;
            }
            .modal-content {
                background: white;
                border-radius: 12px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                transform: scale(0.9);
                transition: transform 0.3s ease;
                max-width: 90vw;
                max-height: 90vh;
                overflow-y: auto;
                width: 100%;
            }
            .modal.show .modal-content {
                transform: scale(1);
            }

            .camera-container {
                position: relative;
                width: 100%;
                max-width: 500px;
                margin: 0 auto;
            }
            
            #cameraPreview {
                width: 100%;
                height: auto;
                border-radius: 8px;
            }
            
            .capture-button {
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: white;
                border: 4px solid #3b82f6;
                border-radius: 50%;
                width: 70px;
                height: 70px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            }
            
            .capture-button:hover {
                background: #f1f5f9;
            }
            
            .capture-button:active {
                transform: translateX(-50%) scale(0.95);
            }

            .image-preview {
                max-width: 200px;
                max-height: 200px;
                border-radius: 8px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }

            .ocr-progress {
                background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%);
                animation: progress 2s infinite;
            }

            @keyframes progress {
                0% { transform: translateX(-100%); }
                50% { transform: translateX(100%); }
                100% { transform: translateX(-100%); }
            }

            .card-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                gap: 1.5rem;
            }

            .business-card {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 12px;
                padding: 1rem;
                color: white;
                position: relative;
                overflow: hidden;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                word-wrap: break-word;
                overflow-wrap: break-word;
                min-height: 280px;
            }

            .business-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            }

            .business-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.1) 100%);
                pointer-events: none;
            }

            .category-badge {
                display: inline-block;
                padding: 0.25rem 0.75rem;
                border-radius: 9999px;
                font-size: 0.75rem;
                font-weight: 500;
                color: white;
                background: rgba(255, 255, 255, 0.2);
                backdrop-filter: blur(10px);
            }

            /* モバイル専用スタイル */
            @media (max-width: 640px) {
                .business-card {
                    padding: 0.75rem;
                    min-height: 260px;
                }
                
                .card-grid {
                    grid-template-columns: 1fr;
                    gap: 1rem;
                }
                
                .business-card h3 {
                    font-size: 1.1rem;
                    line-height: 1.3;
                    word-break: break-all;
                }
                
                .business-card p {
                    font-size: 0.85rem;
                    line-height: 1.3;
                    word-break: break-all;
                }
                
                .modal-content {
                    max-width: 95vw;
                    margin: 0.5rem;
                }
                
                .camera-container {
                    max-width: 100%;
                }
                
                .toast {
                    min-width: 250px;
                    max-width: 90vw;
                    right: 1rem;
                    left: 1rem;
                    right: auto;
                }
            }

            /* テキストが長い場合の省略 */
            .text-truncate {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .text-wrap {
                word-wrap: break-word;
                overflow-wrap: break-word;
                hyphens: auto;
            }
            
            /* スマートフォン向けタッチフレンドリー */
            @media (max-width: 768px) {
                .button-group button {
                    padding: 0.75rem 1rem;
                    font-size: 0.9rem;
                }
                
                input, select, textarea {
                    font-size: 16px; /* iOS zoom防止 */
                }
            }
        </style>
    </head>
    <body class="bg-gray-50 min-h-screen">
        <!-- Toast Container -->
        <div id="toastContainer"></div>

        <!-- Header -->
        <header class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center py-4">
                    <div class="flex items-center space-x-2 sm:space-x-3">
                        <i class="fas fa-address-card text-xl sm:text-2xl text-blue-600"></i>
                        <h1 class="text-lg sm:text-2xl font-bold text-gray-900">名刺管理システム</h1>
                    </div>
                    <div class="flex items-center space-x-2 sm:space-x-4">
                        <button id="addBusinessCardBtn" class="bg-blue-600 hover:bg-blue-700 text-white px-2 sm:px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-1 sm:space-x-2">
                            <i class="fas fa-plus"></i>
                            <span class="hidden sm:inline">新規登録</span>
                        </button>
                        <button id="manageCategoriesBtn" class="bg-gray-600 hover:bg-gray-700 text-white px-2 sm:px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-1 sm:space-x-2">
                            <i class="fas fa-tags"></i>
                            <span class="hidden sm:inline">カテゴリ管理</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8">
            <!-- Search and Filter Section -->
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
                <div class="space-y-4">
                    <div class="w-full">
                        <label for="searchInput" class="block text-sm font-medium text-gray-700 mb-2">検索</label>
                        <div class="relative">
                            <input type="text" id="searchInput" placeholder="名前、会社名、部署で検索..." 
                                   class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <i class="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label for="categoryFilter" class="block text-sm font-medium text-gray-700 mb-2">カテゴリ</label>
                            <select id="categoryFilter" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <option value="">すべてのカテゴリ</option>
                            </select>
                        </div>
                        <div class="flex items-end">
                            <button id="searchBtn" class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200">
                                <i class="fas fa-search mr-2"></i>検索
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Business Cards Grid -->
            <div id="businessCardsGrid" class="card-grid">
                <!-- Business cards will be loaded here -->
            </div>

            <!-- Loading Spinner -->
            <div id="loadingSpinner" class="text-center py-12">
                <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                <p class="mt-4 text-gray-600">読み込み中...</p>
            </div>

            <!-- Empty State -->
            <div id="emptyState" class="text-center py-16 hidden">
                <i class="fas fa-address-card text-6xl text-gray-300 mb-4"></i>
                <h3 class="text-xl font-medium text-gray-900 mb-2">名刺が見つかりません</h3>
                <p class="text-gray-500 mb-6">新しい名刺を追加して管理を始めましょう。</p>
                <button class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200">
                    <i class="fas fa-plus mr-2"></i>最初の名刺を追加
                </button>
            </div>

            <!-- Pagination -->
            <div id="paginationContainer" class="flex justify-center mt-8 hidden">
                <nav class="flex items-center space-x-2">
                    <button id="prevPage" class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <div id="pageNumbers" class="flex space-x-1">
                        <!-- Page numbers will be generated here -->
                    </div>
                    <button id="nextPage" class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </nav>
            </div>
        </main>

        <!-- Business Card Form Modal -->
        <div id="businessCardModal" class="modal">
            <div class="modal-content p-4 sm:p-6 w-full max-w-2xl">
                <div class="flex justify-between items-center mb-6">
                    <h2 id="modalTitle" class="text-xl sm:text-2xl font-bold text-gray-900">新規名刺登録</h2>
                    <button id="closeModalBtn" class="text-gray-400 hover:text-gray-600 text-2xl">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <!-- Image Upload Section -->
                <div class="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-camera mr-2 text-blue-600"></i>
                        名刺画像
                    </h3>
                    
                    <!-- Upload Options -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        <label for="imageUpload" class="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors duration-200">
                            <i class="fas fa-upload mr-2"></i>
                            ファイル選択
                        </label>
                        <input type="file" id="imageUpload" accept="image/*" class="hidden">
                        
                        <button id="cameraBtn" class="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200">
                            <i class="fas fa-camera mr-2"></i>
                            カメラで撮影
                        </button>
                    </div>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        <button id="ocrBtn" class="flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 hidden">
                            <i class="fas fa-eye mr-2"></i>
                            OCR実行
                        </button>
                    </div>

                    <!-- Camera Section -->
                    <div id="cameraSection" class="hidden mb-4">
                        <div class="camera-container">
                            <video id="cameraPreview" autoplay playsinline class="w-full"></video>
                            <button id="captureBtn" class="capture-button">
                                <i class="fas fa-camera text-blue-600 text-xl"></i>
                            </button>
                        </div>
                        <div class="flex justify-center mt-4 space-x-3">
                            <button id="stopCameraBtn" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                                <i class="fas fa-stop mr-2"></i>カメラ停止
                            </button>
                        </div>
                    </div>

                    <!-- Image Preview -->
                    <div id="imagePreviewSection" class="hidden">
                        <div class="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg">
                            <img id="imagePreview" class="image-preview" alt="名刺画像プレビュー">
                        </div>
                        <button id="removeImageBtn" class="mt-2 text-sm text-red-600 hover:text-red-800 flex items-center">
                            <i class="fas fa-trash mr-1"></i>画像を削除
                        </button>
                    </div>

                    <!-- OCR Progress -->
                    <div id="ocrProgress" class="hidden mt-4">
                        <div class="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
                            <div class="flex items-center space-x-3">
                                <div class="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                <span class="text-blue-700 font-medium">OCR処理中...</span>
                            </div>
                        </div>
                    </div>
                </div>

                <form id="businessCardForm" class="space-y-4">
                    <input type="hidden" id="cardId">
                    <input type="hidden" id="imageId">

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label for="name" class="block text-sm font-medium text-gray-700 mb-1">名前 <span class="text-red-500">*</span></label>
                            <input type="text" id="name" name="name" required 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                        <div>
                            <label for="company" class="block text-sm font-medium text-gray-700 mb-1">会社名 <span class="text-red-500">*</span></label>
                            <input type="text" id="company" name="company" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label for="department" class="block text-sm font-medium text-gray-700 mb-1">部署</label>
                            <input type="text" id="department" name="department"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                        <div>
                            <label for="position" class="block text-sm font-medium text-gray-700 mb-1">役職</label>
                            <input type="text" id="position" name="position"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                            <input type="email" id="email" name="email"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                        <div>
                            <label for="phone" class="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
                            <input type="tel" id="phone" name="phone"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                    </div>

                    <div>
                        <label for="categoryId" class="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
                        <select id="categoryId" name="category_id" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="">カテゴリを選択</option>
                        </select>
                    </div>

                    <div>
                        <label for="address" class="block text-sm font-medium text-gray-700 mb-1">住所</label>
                        <textarea id="address" name="address" rows="2"
                                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
                    </div>

                    <div>
                        <label for="notes" class="block text-sm font-medium text-gray-700 mb-1">メモ</label>
                        <textarea id="notes" name="notes" rows="3"
                                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
                    </div>

                    <div class="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                        <button type="button" id="cancelBtn" class="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors duration-200">
                            キャンセル
                        </button>
                        <button type="submit" id="saveBtn" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200">
                            <i class="fas fa-save mr-2"></i>保存
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Category Management Modal -->
        <div id="categoryModal" class="modal">
            <div class="modal-content p-4 sm:p-6 w-full max-w-lg">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl sm:text-2xl font-bold text-gray-900">カテゴリ管理</h2>
                    <button id="closeCategoryModalBtn" class="text-gray-400 hover:text-gray-600 text-2xl">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <!-- Add Category Form -->
                <form id="categoryForm" class="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 class="text-lg font-medium text-gray-800 mb-4">新しいカテゴリを追加</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label for="categoryName" class="block text-sm font-medium text-gray-700 mb-1">カテゴリ名</label>
                            <input type="text" id="categoryName" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                        <div>
                            <label for="categoryColor" class="block text-sm font-medium text-gray-700 mb-1">色</label>
                            <input type="color" id="categoryColor" value="#3B82F6"
                                   class="w-full h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                    </div>
                    <div class="mt-4">
                        <label for="categoryDescription" class="block text-sm font-medium text-gray-700 mb-1">説明</label>
                        <textarea id="categoryDescription" rows="2"
                                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
                    </div>
                    <div class="mt-4">
                        <button type="submit" class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200">
                            <i class="fas fa-plus mr-2"></i>追加
                        </button>
                    </div>
                </form>

                <!-- Categories List -->
                <div id="categoriesList">
                    <h3 class="text-lg font-medium text-gray-800 mb-4">既存のカテゴリ</h3>
                    <div id="categoryItems" class="space-y-2">
                        <!-- Categories will be loaded here -->
                    </div>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app