// Global state
let businessCards = [];
let categories = [];
let currentPage = 1;
let totalPages = 1;
let currentSearch = '';
let currentCategoryFilter = '';
let isEditing = false;
let currentEditId = null;
let cameraStream = null;
let currentImageFile = null;
let currentImageId = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadCategories();
    loadBusinessCards();
});

// Event listeners
function initializeEventListeners() {
    // Modal controls
    document.getElementById('addBusinessCardBtn').addEventListener('click', openBusinessCardModal);
    document.getElementById('closeModalBtn').addEventListener('click', closeBusinessCardModal);
    document.getElementById('cancelBtn').addEventListener('click', closeBusinessCardModal);
    document.getElementById('businessCardForm').addEventListener('submit', saveBusinessCard);
    
    // Category modal
    document.getElementById('manageCategoriesBtn').addEventListener('click', openCategoryModal);
    document.getElementById('closeCategoryModalBtn').addEventListener('click', closeCategoryModal);
    document.getElementById('categoryForm').addEventListener('submit', saveCategory);
    
    // Search and filter
    document.getElementById('searchBtn').addEventListener('click', performSearch);
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') performSearch();
    });
    document.getElementById('categoryFilter').addEventListener('change', performSearch);
    
    // Image upload
    document.getElementById('imageUpload').addEventListener('change', handleImageUpload);
    document.getElementById('cameraBtn').addEventListener('click', startCamera);
    document.getElementById('stopCameraBtn').addEventListener('click', stopCamera);
    document.getElementById('captureBtn').addEventListener('click', capturePhoto);
    document.getElementById('removeImageBtn').addEventListener('click', removeImage);
    document.getElementById('ocrBtn').addEventListener('click', performOCR);
    
    // Pagination
    document.getElementById('prevPage').addEventListener('click', () => changePage(currentPage - 1));
    document.getElementById('nextPage').addEventListener('click', () => changePage(currentPage + 1));
    
    // Close modal when clicking outside
    document.getElementById('businessCardModal').addEventListener('click', function(e) {
        if (e.target === this) closeBusinessCardModal();
    });
    
    document.getElementById('categoryModal').addEventListener('click', function(e) {
        if (e.target === this) closeCategoryModal();
    });
}

// Toast notification system
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.getElementById('toastContainer').appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remove toast after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Load categories
async function loadCategories() {
    try {
        const response = await axios.get('/api/categories');
        
        if (response.data.success) {
            categories = response.data.data;
            populateCategorySelects();
            loadCategoriesList();
        } else {
            console.error('Failed to load categories:', response.data.error);
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        showToast('カテゴリの読み込みに失敗しました', 'error');
    }
}

function populateCategorySelects() {
    const categorySelects = ['categoryFilter', 'categoryId'];
    
    categorySelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        // Clear existing options (except the first one for filter)
        if (selectId === 'categoryFilter') {
            select.innerHTML = '<option value="">すべてのカテゴリ</option>';
        } else {
            select.innerHTML = '<option value="">カテゴリを選択</option>';
        }
        
        // Add category options
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
    });
}

// Load business cards
async function loadBusinessCards(page = 1) {
    try {
        showLoading(true);
        
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', '12');
        
        if (currentSearch) {
            params.append('search', currentSearch);
        }
        
        if (currentCategoryFilter) {
            params.append('category_id', currentCategoryFilter);
        }
        
        const response = await axios.get(`/api/business-cards?${params.toString()}`);
        
        if (response.data.success) {
            businessCards = response.data.data;
            currentPage = response.data.pagination.page;
            totalPages = response.data.pagination.totalPages;
            
            displayBusinessCards();
            updatePagination();
        } else {
            console.error('Failed to load business cards:', response.data.error);
            showToast('名刺の読み込みに失敗しました', 'error');
        }
    } catch (error) {
        console.error('Error loading business cards:', error);
        showToast('名刺の読み込みに失敗しました', 'error');
    } finally {
        showLoading(false);
    }
}

function showLoading(show) {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const businessCardsGrid = document.getElementById('businessCardsGrid');
    const emptyState = document.getElementById('emptyState');
    const paginationContainer = document.getElementById('paginationContainer');
    
    if (show) {
        loadingSpinner.style.display = 'block';
        businessCardsGrid.style.display = 'none';
        emptyState.style.display = 'none';
        paginationContainer.classList.add('hidden');
    } else {
        loadingSpinner.style.display = 'none';
        businessCardsGrid.style.display = 'grid';
    }
}

function displayBusinessCards() {
    const grid = document.getElementById('businessCardsGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (businessCards.length === 0) {
        grid.style.display = 'none';
        emptyState.classList.remove('hidden');
        return;
    }
    
    grid.style.display = 'grid';
    emptyState.classList.add('hidden');
    
    grid.innerHTML = businessCards.map(card => `
        <div class="business-card group" data-id="${card.id}">
            <div class="relative z-10">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex-1 text-wrap">
                        <h3 class="text-xl font-bold text-white mb-1">${escapeHtml(card.name)}</h3>
                        <p class="text-white opacity-90 font-medium">${escapeHtml(card.company)}</p>
                        ${card.department ? `<p class="text-white opacity-75 text-sm">${escapeHtml(card.department)}</p>` : ''}
                        ${card.position ? `<p class="text-white opacity-75 text-sm">${escapeHtml(card.position)}</p>` : ''}
                    </div>
                    ${card.image_url ? `
                        <div class="ml-4 flex-shrink-0">
                            <img src="${card.image_url}" alt="名刺画像" class="w-12 h-12 rounded-lg object-cover border-2 border-white border-opacity-30">
                        </div>
                    ` : ''}
                </div>
                
                <div class="space-y-2 mb-4">
                    ${card.email ? `
                        <div class="flex items-center text-white opacity-90 text-sm">
                            <i class="fas fa-envelope mr-2 w-4 flex-shrink-0"></i>
                            <span class="text-wrap break-all">${escapeHtml(card.email)}</span>
                        </div>
                    ` : ''}
                    ${card.phone ? `
                        <div class="flex items-center text-white opacity-90 text-sm">
                            <i class="fas fa-phone mr-2 w-4 flex-shrink-0"></i>
                            <span class="text-wrap">${escapeHtml(card.phone)}</span>
                        </div>
                    ` : ''}
                    ${card.category_name ? `
                        <div class="flex items-center">
                            <span class="category-badge" style="background-color: ${card.category_color}">
                                <i class="fas fa-tag mr-1"></i>
                                ${escapeHtml(card.category_name)}
                            </span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button onclick="editBusinessCard(${card.id})" class="bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-lg transition-all duration-200">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteBusinessCard(${card.id})" class="bg-red-500 bg-opacity-80 hover:bg-opacity-100 text-white p-2 rounded-lg transition-all duration-200">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function updatePagination() {
    const paginationContainer = document.getElementById('paginationContainer');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const pageNumbers = document.getElementById('pageNumbers');
    
    if (totalPages <= 1) {
        paginationContainer.classList.add('hidden');
        return;
    }
    
    paginationContainer.classList.remove('hidden');
    
    // Update prev/next buttons
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    
    // Generate page numbers
    pageNumbers.innerHTML = '';
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = `px-3 py-2 text-sm font-medium border ${
            i === currentPage
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }`;
        
        if (i !== currentPage) {
            pageBtn.addEventListener('click', () => changePage(i));
        }
        
        pageNumbers.appendChild(pageBtn);
    }
}

function changePage(page) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    loadBusinessCards(page);
}

// Search functionality
function performSearch() {
    currentSearch = document.getElementById('searchInput').value.trim();
    currentCategoryFilter = document.getElementById('categoryFilter').value;
    currentPage = 1;
    loadBusinessCards();
}

// Business card modal functions
function openBusinessCardModal(card = null) {
    const modal = document.getElementById('businessCardModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('businessCardForm');
    
    if (card) {
        isEditing = true;
        currentEditId = card.id;
        modalTitle.textContent = '名刺編集';
        fillForm(card);
        
        // Load image if exists
        if (card.image_id) {
            currentImageId = card.image_id;
            showImagePreview(card.image_url);
        }
    } else {
        isEditing = false;
        currentEditId = null;
        modalTitle.textContent = '新規名刺登録';
        form.reset();
        resetImageUpload();
    }
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeBusinessCardModal() {
    const modal = document.getElementById('businessCardModal');
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
    
    // Stop camera if active
    stopCamera();
    resetImageUpload();
}

function fillForm(card) {
    const fields = ['name', 'company', 'department', 'position', 'email', 'phone', 'address', 'notes'];
    
    fields.forEach(field => {
        const element = document.getElementById(field);
        if (element && card[field]) {
            element.value = card[field];
        }
    });
    
    document.getElementById('cardId').value = card.id || '';
    document.getElementById('categoryId').value = card.category_id || '';
}

// Image handling
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        if (!file.type.startsWith('image/')) {
            showToast('画像ファイルを選択してください', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showToast('ファイルサイズは5MB以下にしてください', 'error');
            return;
        }
        
        currentImageFile = file;
        showImagePreview(URL.createObjectURL(file));
        showOCRButton();
    }
}

function showImagePreview(src) {
    const previewSection = document.getElementById('imagePreviewSection');
    const preview = document.getElementById('imagePreview');
    
    if (preview && previewSection) {
        preview.src = src;
        previewSection.classList.remove('hidden');
    }
}

function showOCRButton() {
    const ocrBtn = document.getElementById('ocrBtn');
    if (ocrBtn) {
        ocrBtn.classList.remove('hidden');
    }
}

function removeImage() {
    currentImageFile = null;
    currentImageId = null;
    
    const previewSection = document.getElementById('imagePreviewSection');
    const ocrBtn = document.getElementById('ocrBtn');
    const imageUpload = document.getElementById('imageUpload');
    
    if (previewSection) previewSection.classList.add('hidden');
    if (ocrBtn) ocrBtn.classList.add('hidden');
    if (imageUpload) imageUpload.value = '';
}

function resetImageUpload() {
    removeImage();
    const cameraSection = document.getElementById('cameraSection');
    const ocrProgress = document.getElementById('ocrProgress');
    
    if (cameraSection) cameraSection.classList.add('hidden');
    if (ocrProgress) ocrProgress.classList.add('hidden');
}

// Camera functionality
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'environment' // Use back camera on mobile
            } 
        });
        
        cameraStream = stream;
        const video = document.getElementById('cameraPreview');
        const cameraSection = document.getElementById('cameraSection');
        
        if (video && cameraSection) {
            video.srcObject = stream;
            cameraSection.classList.remove('hidden');
        }
        
        showToast('カメラが起動しました', 'success');
    } catch (error) {
        console.error('Camera error:', error);
        showToast('カメラの起動に失敗しました', 'error');
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
        
        const cameraSection = document.getElementById('cameraSection');
        if (cameraSection) {
            cameraSection.classList.add('hidden');
        }
    }
}

function capturePhoto() {
    const video = document.getElementById('cameraPreview');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!video) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    canvas.toBlob(blob => {
        currentImageFile = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
        showImagePreview(URL.createObjectURL(blob));
        showOCRButton();
        stopCamera();
        showToast('写真を撮影しました', 'success');
    }, 'image/jpeg', 0.9);
}

// 最高精度OCRシステム（複数エンジン + AI統合 + 機械学習強化）
async function performOCR() {
    if (!currentImageFile) {
        showToast('画像を選択してください', 'error');
        return;
    }
    
    const ocrProgress = document.getElementById('ocrProgress');
    if (ocrProgress) {
        ocrProgress.classList.remove('hidden');
    }
    
    try {
        showToast('AI画像分析を実行中...', 'info');
        
        // Step 1: AI画像品質分析
        const imageAnalysis = await analyzeImageQuality(currentImageFile);
        
        showToast('最適前処理パイプラインを構築中...', 'info');
        
        // Step 2: 品質分析に基づく最適前処理パイプラインの選択
        const preprocessingPipeline = await buildOptimalPreprocessingPipeline(currentImageFile, imageAnalysis);
        
        showToast('ハイブリッドOCRエンジンを起動中...', 'info');
        
        // Step 3: ハイブリッドOCRエンジンで並行処理
        const ocrResults = await runHybridOCR(preprocessingPipeline, imageAnalysis);
        
        showToast('機械学習による結果統合中...', 'info');
        
        // Step 4: 機械学習アルゴリズムによる結果統合
        const finalText = await mlBasedResultConsolidation(ocrResults, imageAnalysis);
        
        console.log('最終OCR結果:', finalText);
        
        if (finalText && finalText.trim()) {
            await parseOCRTextWithAI(finalText, ocrResults, imageAnalysis);
            showToast('最高精度OCR処理が完了しました', 'success');
        } else {
            showToast('テキストを認識できませんでした。画像の改善を試してください', 'warning');
        }
    } catch (error) {
        console.error('Advanced OCR Error:', error);
        showToast('高度OCR処理に失敗しました', 'error');
    } finally {
        if (ocrProgress) {
            ocrProgress.classList.add('hidden');
        }
    }
}

// AI画像品質分析
async function analyzeImageQuality(file) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // 画質メトリクス計算
            const metrics = {
                brightness: calculateBrightness(data),
                contrast: calculateContrast(data),
                sharpness: calculateSharpness(data, canvas.width, canvas.height),
                noise: calculateNoise(data, canvas.width, canvas.height),
                textDensity: estimateTextDensity(data, canvas.width, canvas.height),
                backgroundUniformity: calculateBackgroundUniformity(data),
                resolution: { width: canvas.width, height: canvas.height },
                aspectRatio: canvas.width / canvas.height
            };
            
            // 最適処理戦略を決定
            metrics.strategy = determineOptimalStrategy(metrics);
            
            resolve(metrics);
        };
        
        img.src = URL.createObjectURL(file);
    });
}

// 明度計算
function calculateBrightness(data) {
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        sum += gray;
    }
    return sum / (data.length / 4);
}

// コントラスト計算
function calculateContrast(data) {
    const brightness = calculateBrightness(data);
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        sum += Math.pow(gray - brightness, 2);
    }
    return Math.sqrt(sum / (data.length / 4));
}

// シャープネス計算（Sobel演算子）
function calculateSharpness(data, width, height) {
    let sharpnessSum = 0;
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let gx = 0, gy = 0;
            
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const idx = ((y + ky) * width + (x + kx)) * 4;
                    const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                    const kernelIdx = (ky + 1) * 3 + (kx + 1);
                    gx += gray * sobelX[kernelIdx];
                    gy += gray * sobelY[kernelIdx];
                }
            }
            
            sharpnessSum += Math.sqrt(gx * gx + gy * gy);
        }
    }
    
    return sharpnessSum / ((width - 2) * (height - 2));
}

// ノイズレベル計算
function calculateNoise(data, width, height) {
    let noiseSum = 0;
    let count = 0;
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            
            // 近隣ピクセルとの差の平均
            const neighbors = [
                data[((y-1) * width + x) * 4],
                data[((y+1) * width + x) * 4],
                data[(y * width + (x-1)) * 4],
                data[(y * width + (x+1)) * 4]
            ];
            
            const neighborAvg = neighbors.reduce((sum, val, i) => {
                const neighborGray = 0.299 * val + 0.587 * data[((y + (i < 2 ? (i === 0 ? -1 : 1) : 0)) * width + (x + (i >= 2 ? (i === 2 ? -1 : 1) : 0))) * 4 + 1] + 0.114 * data[((y + (i < 2 ? (i === 0 ? -1 : 1) : 0)) * width + (x + (i >= 2 ? (i === 2 ? -1 : 1) : 0))) * 4 + 2];
                return sum + neighborGray;
            }, 0) / 4;
            
            noiseSum += Math.abs(gray - neighborAvg);
            count++;
        }
    }
    
    return count > 0 ? noiseSum / count : 0;
}

// テキスト密度推定
function estimateTextDensity(data, width, height) {
    const threshold = 128;
    let textPixels = 0;
    let totalPixels = 0;
    
    for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (gray < threshold) textPixels++;
        totalPixels++;
    }
    
    return textPixels / totalPixels;
}

// 背景均一性計算
function calculateBackgroundUniformity(data) {
    const grayValues = [];
    for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        grayValues.push(gray);
    }
    
    grayValues.sort((a, b) => a - b);
    const median = grayValues[Math.floor(grayValues.length / 2)];
    
    // 上位25%の値を背景として判定
    const backgroundThreshold = grayValues[Math.floor(grayValues.length * 0.75)];
    const backgroundPixels = grayValues.filter(g => g >= backgroundThreshold);
    
    if (backgroundPixels.length === 0) return 0;
    
    const backgroundMean = backgroundPixels.reduce((sum, val) => sum + val, 0) / backgroundPixels.length;
    const variance = backgroundPixels.reduce((sum, val) => sum + Math.pow(val - backgroundMean, 2), 0) / backgroundPixels.length;
    
    return 1 / (1 + Math.sqrt(variance)); // 分散が小さいほど均一性が高い
}

// 最適処理戦略決定
function determineOptimalStrategy(metrics) {
    const strategy = {
        enhanceContrast: metrics.contrast < 30,
        denoiseRequired: metrics.noise > 15,
        sharpenRequired: metrics.sharpness < 5,
        brightnessCorrectionNeeded: metrics.brightness < 100 || metrics.brightness > 200,
        backgroundNormalizationNeeded: metrics.backgroundUniformity < 0.7,
        highResolutionProcessing: metrics.resolution.width > 1000 && metrics.resolution.height > 800,
        textDensity: metrics.textDensity > 0.1 ? 'high' : 'low'
    };
    
    return strategy;
}

// 最適前処理パイプライン構築
async function buildOptimalPreprocessingPipeline(file, analysis) {
    const pipeline = [];
    
    // 戦略に基づいて処理を選択
    if (analysis.strategy.brightnessCorrectionNeeded) {
        pipeline.push(await preprocessImageBrightnessCorrection(file, analysis));
    }
    
    if (analysis.strategy.enhanceContrast) {
        pipeline.push(await preprocessImageAdvancedContrast(file, analysis));
    }
    
    if (analysis.strategy.denoiseRequired) {
        pipeline.push(await preprocessImageAdvancedDenoise(file, analysis));
    }
    
    if (analysis.strategy.sharpenRequired) {
        pipeline.push(await preprocessImageAdvancedSharpen(file, analysis));
    }
    
    // 常に標準処理も含める
    pipeline.push(await preprocessImageForOCR(file));
    
    // テキスト密度に応じた特別処理
    if (analysis.strategy.textDensity === 'high') {
        pipeline.push(await preprocessImageHighDensityText(file, analysis));
    }
    
    return pipeline;
}

// 高コントラスト前処理
async function preprocessImageHighContrast(file) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            const scaleFactor = 3;
            canvas.width = img.width * scaleFactor;
            canvas.height = img.height * scaleFactor;
            
            ctx.imageSmoothingEnabled = false;
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // 極高コントラスト処理
            for (let i = 0; i < data.length; i += 4) {
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                const enhanced = gray > 100 ? 255 : 0; // より厳しい閾値
                
                data[i] = enhanced;
                data[i + 1] = enhanced;
                data[i + 2] = enhanced;
            }
            
            ctx.putImageData(imageData, 0, 0);
            canvas.toBlob(resolve, 'image/png', 1.0);
        };
        
        img.src = URL.createObjectURL(file);
    });
}

// エッジ強調前処理
async function preprocessImageEdgeEnhanced(file) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            const scaleFactor = 2.5;
            canvas.width = img.width * scaleFactor;
            canvas.height = img.height * scaleFactor;
            
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // ガンマ補正 + エッジ強調
            const gamma = 0.7;
            for (let i = 0; i < data.length; i += 4) {
                const r = Math.pow(data[i] / 255, gamma) * 255;
                const g = Math.pow(data[i + 1] / 255, gamma) * 255;
                const b = Math.pow(data[i + 2] / 255, gamma) * 255;
                
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                const enhanced = gray > 130 ? 255 : 0;
                
                data[i] = enhanced;
                data[i + 1] = enhanced;
                data[i + 2] = enhanced;
            }
            
            ctx.putImageData(imageData, 0, 0);
            canvas.toBlob(resolve, 'image/png', 1.0);
        };
        
        img.src = URL.createObjectURL(file);
    });
}

// ハイブリッドOCRエンジン（画質分析に基づく最適化）
async function runHybridOCR(images, analysis) {
    const ocrPromises = [];
    
    // 画質分析に基づいてOCR設定を最適化
    const ocrConfigs = generateOptimalOCRConfigs(analysis);
    
    images.forEach((image, imageIndex) => {
        ocrConfigs.forEach((config, configIndex) => {
            ocrPromises.push(
                Tesseract.recognize(image, config.languages, {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            console.log(`Hybrid OCR ${imageIndex + 1}-${configIndex + 1} (${config.name}): ${Math.round(m.progress * 100)}%`);
                        }
                    },
                    ...config.options
                }).then(result => ({ 
                    ...result, 
                    engine: `hybrid_${imageIndex + 1}_${config.name}`,
                    config: config.name,
                    imageIndex,
                    configIndex
                }))
            );
        });
    });
    
    return Promise.all(ocrPromises);
}

// 画質分析に基づく最適OCR設定生成
function generateOptimalOCRConfigs(analysis) {
    const configs = [];
    
    // 基本設定
    configs.push({
        name: 'standard',
        languages: 'jpn+eng',
        options: {
            tessedit_pageseg_mode: Tesseract.PSM.AUTO,
            preserve_interword_spaces: '1',
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン一二三四五六七八九十百千万億兆京垓株式会社有限会社合同会社財団法人社団法人部長課長主任係長取締役社長専務常務部課室局科係グループチーム営業総務人事経理財務企画開発技術情報システム品質管理製造生産物流購買調達広告宣伝マーケティングデザイン@.-()[]{}+*#&%$!?,:;\'"',
            tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY
        }
    });
    
    // 高解像度用設定
    if (analysis.strategy.highResolutionProcessing) {
        configs.push({
            name: 'high_resolution',
            languages: 'jpn+eng',
            options: {
                tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
                preserve_interword_spaces: '1',
                tessedit_ocr_engine_mode: Tesseract.OEM.TESSERACT_LSTM_COMBINED,
                user_defined_dpi: '300'
            }
        });
    }
    
    // 低コントラスト用設定
    if (analysis.strategy.enhanceContrast) {
        configs.push({
            name: 'low_contrast',
            languages: 'jpn+eng',
            options: {
                tessedit_pageseg_mode: Tesseract.PSM.SINGLE_WORD,
                preserve_interword_spaces: '0',
                tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
                tessedit_write_images: '0'
            }
        });
    }
    
    // 高密度テキスト用設定
    if (analysis.strategy.textDensity === 'high') {
        configs.push({
            name: 'high_density_text',
            languages: 'jpn+eng',
            options: {
                tessedit_pageseg_mode: Tesseract.PSM.SINGLE_COLUMN,
                preserve_interword_spaces: '1',
                tessedit_ocr_engine_mode: Tesseract.OEM.TESSERACT_LSTM_COMBINED
            }
        });
    }
    
    // ノイズ対応用設定
    if (analysis.strategy.denoiseRequired) {
        configs.push({
            name: 'noise_resistant',
            languages: 'jpn+eng', 
            options: {
                tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
                preserve_interword_spaces: '1',
                tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
                textord_noise_rejwords: '1',
                textord_noise_rejrows: '1'
            }
        });
    }
    
    return configs;
}

// 機械学習ベースの結果統合
async function mlBasedResultConsolidation(results, analysis) {
    console.log('ML-Based OCR Consolidation:', results.length, 'results');
    
    // 各結果の詳細分析
    const analyzedResults = results.map((result, index) => {
        const textMetrics = analyzeTextQuality(result.data.text);
        const contextualScore = calculateContextualScore(result.data.text, analysis);
        
        return {
            ...result,
            textMetrics,
            contextualScore,
            combinedScore: (result.data.confidence * 0.4) + (textMetrics.quality * 0.3) + (contextualScore * 0.3)
        };
    });
    
    // 最高スコアの結果を基準に統合
    const sortedResults = analyzedResults.sort((a, b) => b.combinedScore - a.combinedScore);
    const bestResult = sortedResults[0];
    
    console.log('Best Result Score:', bestResult.combinedScore);
    console.log('Best Result Config:', bestResult.config);
    
    // 高品質な結果を組み合わせて最終テキストを生成
    const highQualityResults = sortedResults.filter(r => r.combinedScore > bestResult.combinedScore * 0.8);
    
    if (highQualityResults.length > 1) {
        return await mergeHighQualityResults(highQualityResults, analysis);
    } else {
        return bestResult.data.text;
    }
}

// テキスト品質分析
function analyzeTextQuality(text) {
    if (!text || text.trim().length === 0) {
        return { quality: 0, features: {} };
    }
    
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    const features = {
        lineCount: lines.length,
        avgLineLength: lines.reduce((sum, line) => sum + line.length, 0) / lines.length,
        japaneseCharRatio: calculateJapaneseRatio(text),
        emailCount: (text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []).length,
        phoneCount: (text.match(/\d{2,4}[-\s]?\d{2,4}[-\s]?\d{3,4}/g) || []).length,
        companyIndicators: (text.match(/株式会社|有限会社|合同会社|Corporation|Corp|Inc|Ltd/g) || []).length,
        positionIndicators: (text.match(/社長|部長|課長|取締役|Manager|Director|CEO/g) || []).length,
        structuralConsistency: calculateStructuralConsistency(lines)
    };
    
    // 品質スコア計算
    let quality = 0;
    
    // 行数による加点
    quality += Math.min(features.lineCount * 0.1, 0.3);
    
    // 平均行長による加点
    if (features.avgLineLength > 3 && features.avgLineLength < 50) quality += 0.2;
    
    // 日本語比率による加点
    quality += features.japaneseCharRatio * 0.2;
    
    // 構造的一貫性による加点
    quality += features.structuralConsistency * 0.2;
    
    // 名刺要素の存在による加点
    if (features.emailCount > 0) quality += 0.1;
    if (features.phoneCount > 0) quality += 0.1;
    if (features.companyIndicators > 0) quality += 0.1;
    if (features.positionIndicators > 0) quality += 0.05;
    
    return { quality: Math.min(quality, 1.0), features };
}

// 日本語文字比率計算
function calculateJapaneseRatio(text) {
    const japaneseChars = text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || [];
    const totalChars = text.replace(/\s/g, '').length;
    return totalChars > 0 ? japaneseChars.length / totalChars : 0;
}

// 構造的一貫性計算
function calculateStructuralConsistency(lines) {
    if (lines.length < 2) return 0.5;
    
    let consistencyScore = 0;
    const lengths = lines.map(line => line.length);
    const avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;
    
    // 長さの分散が小さいほど一貫性が高い
    consistencyScore += Math.max(0, 1 - variance / (avgLength * avgLength));
    
    // 連続する行の関連性チェック
    let relationshipScore = 0;
    for (let i = 0; i < lines.length - 1; i++) {
        const similarity = calculateLineSimilarity(lines[i], lines[i + 1]);
        relationshipScore += similarity;
    }
    relationshipScore /= Math.max(1, lines.length - 1);
    
    return (consistencyScore + relationshipScore) / 2;
}

// 行の類似性計算
function calculateLineSimilarity(line1, line2) {
    // 文字種類の類似性
    const hasJapanese1 = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(line1);
    const hasJapanese2 = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(line2);
    const hasNumbers1 = /\d/.test(line1);
    const hasNumbers2 = /\d/.test(line2);
    const hasEmail1 = /@/.test(line1);
    const hasEmail2 = /@/.test(line2);
    
    let similarity = 0;
    if (hasJapanese1 === hasJapanese2) similarity += 0.3;
    if (hasNumbers1 === hasNumbers2) similarity += 0.2;
    if (hasEmail1 === hasEmail2) similarity += 0.5;
    
    return similarity;
}

// コンテクスチュアルスコア計算
function calculateContextualScore(text, analysis) {
    let score = 0.5; // ベーススコア
    
    // 画質分析に基づくスコア調整
    if (analysis.strategy.textDensity === 'high' && text.split('\n').length > 5) {
        score += 0.2;
    }
    
    if (analysis.brightness > 150 && analysis.contrast > 40 && text.length > 50) {
        score += 0.2;
    }
    
    if (analysis.strategy.denoiseRequired && text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/) && text.length < 200) {
        score += 0.1;
    }
    
    return Math.min(score, 1.0);
}

// 高品質結果のマージ
async function mergeHighQualityResults(results, analysis) {
    const texts = results.map(r => r.data.text);
    const scores = results.map(r => r.combinedScore);
    
    // 重み付きマージアルゴリズム
    const mergedLines = {};
    
    texts.forEach((text, textIndex) => {
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        const weight = scores[textIndex];
        
        lines.forEach(line => {
            const normalizedLine = normalizeTextForComparison(line);
            
            if (!mergedLines[normalizedLine]) {
                mergedLines[normalizedLine] = {
                    originalLines: [],
                    totalWeight: 0,
                    bestOriginal: line
                };
            }
            
            mergedLines[normalizedLine].originalLines.push({
                line: line,
                weight: weight
            });
            mergedLines[normalizedLine].totalWeight += weight;
            
            // より高い重みの行を保持
            if (weight > (mergedLines[normalizedLine].bestWeight || 0)) {
                mergedLines[normalizedLine].bestOriginal = line;
                mergedLines[normalizedLine].bestWeight = weight;
            }
        });
    });
    
    // 重み順でソートして最終テキストを構築
    const sortedLines = Object.values(mergedLines)
        .sort((a, b) => b.totalWeight - a.totalWeight)
        .map(item => item.bestOriginal);
    
    return sortedLines.join('\n');
}

// 比較用テキスト正規化
function normalizeTextForComparison(text) {
    return text
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .replace(/[　\s]/g, '')
        .replace(/[！-～]/g, function(s) {
            return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
        });
}

// テキスト結果のマージ
function mergeTextResults(texts, scores) {
    const lines = {};
    
    texts.forEach((text, textIndex) => {
        const textLines = text.split('\\n').filter(line => line.trim().length > 0);
        
        textLines.forEach(line => {
            const cleanLine = line.trim();
            if (cleanLine.length < 2) return;
            
            if (!lines[cleanLine]) {
                lines[cleanLine] = {
                    count: 0,
                    totalScore: 0,
                    sources: []
                };
            }
            
            lines[cleanLine].count++;
            lines[cleanLine].totalScore += scores[textIndex] || 50;
            lines[cleanLine].sources.push(textIndex);
        });
    });
    
    // 信頼度とカウントによるソート
    const sortedLines = Object.entries(lines)
        .map(([text, data]) => ({
            text,
            avgScore: data.totalScore / data.count,
            count: data.count,
            reliability: (data.avgScore * 0.7) + (data.count * 15)
        }))
        .sort((a, b) => b.reliability - a.reliability)
        .map(item => item.text);
    
    return sortedLines.join('\\n');
}

// 既存の高度な画像前処理関数（OCR精度向上のため）
async function preprocessImageForOCR(file) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            // 最適サイズ計算（OCR用に高解像度化）
            let scaleFactor = 3; // 3倍にスケールアップ
            const maxWidth = 2400;
            const maxHeight = 1600;
            
            // 最大サイズ制限
            if (img.width * scaleFactor > maxWidth) {
                scaleFactor = maxWidth / img.width;
            }
            if (img.height * scaleFactor > maxHeight) {
                scaleFactor = Math.min(scaleFactor, maxHeight / img.height);
            }
            
            canvas.width = Math.round(img.width * scaleFactor);
            canvas.height = Math.round(img.height * scaleFactor);
            
            // 高品質レンダリング設定
            ctx.imageSmoothingEnabled = false; // シャープネス向上
            ctx.textRenderingOptimization = 'optimizeQuality';
            
            // 白背景を設定
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // 画像を描画
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // 画像データを取得
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // 高度な画像処理パイプライン
            processImageData(data);
            
            // 処理した画像データをキャンバスに適用
            ctx.putImageData(imageData, 0, 0);
            
            // さらなる後処理
            applyAdvancedFilters(ctx, canvas.width, canvas.height);
            
            // 最高品質でPNG出力
            canvas.toBlob(resolve, 'image/png', 1.0);
        };
        
        img.src = URL.createObjectURL(file);
    });
}

// 高度な画像データ処理
function processImageData(data) {
    const pixels = data.length / 4;
    const grayValues = [];
    
    // Step 1: グレースケール変換と分布分析
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // より精密なグレースケール変換（NTSC係数）
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        grayValues.push(gray);
    }
    
    // Step 2: 大津の手法による最適閾値計算
    const threshold = calculateOptimalThreshold(grayValues);
    
    // Step 3: アダプティブしきい値処理
    for (let i = 0; i < grayValues.length; i++) {
        const pixelIndex = i * 4;
        const gray = grayValues[i];
        
        // 局所的なコントラスト改善
        const enhanced = applyLocalContrast(grayValues, i, Math.sqrt(grayValues.length), threshold);
        
        data[pixelIndex] = enhanced;     // Red
        data[pixelIndex + 1] = enhanced; // Green  
        data[pixelIndex + 2] = enhanced; // Blue
        // Alpha値はそのまま
    }
}

// 大津の手法による最適閾値計算
function calculateOptimalThreshold(grayValues) {
    const histogram = new Array(256).fill(0);
    
    // ヒストグラム作成
    grayValues.forEach(value => histogram[value]++);
    
    const total = grayValues.length;
    let sum = 0;
    for (let i = 0; i < 256; i++) {
        sum += i * histogram[i];
    }
    
    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let varMax = 0;
    let threshold = 0;
    
    for (let t = 0; t < 256; t++) {
        wB += histogram[t];
        if (wB === 0) continue;
        
        wF = total - wB;
        if (wF === 0) break;
        
        sumB += t * histogram[t];
        
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;
        
        const varBetween = wB * wF * (mB - mF) * (mB - mF);
        
        if (varBetween > varMax) {
            varMax = varBetween;
            threshold = t;
        }
    }
    
    return threshold;
}

// 局所コントラスト改善
function applyLocalContrast(grayValues, index, width, globalThreshold) {
    const x = index % width;
    const y = Math.floor(index / width);
    const windowSize = 15;
    const halfWindow = Math.floor(windowSize / 2);
    
    let localSum = 0;
    let localCount = 0;
    
    // 局所的な平均値計算
    for (let dy = -halfWindow; dy <= halfWindow; dy++) {
        for (let dx = -halfWindow; dx <= halfWindow; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            const ni = ny * width + nx;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < grayValues.length / width && ni < grayValues.length) {
                localSum += grayValues[ni];
                localCount++;
            }
        }
    }
    
    const localMean = localCount > 0 ? localSum / localCount : globalThreshold;
    const currentGray = grayValues[index];
    
    // アダプティブ閾値処理
    const adaptiveThreshold = localMean * 0.85; // 15%のマージン
    
    if (currentGray > adaptiveThreshold) {
        return 255; // 白
    } else {
        return 0;   // 黒
    }
}

// 高度なフィルタ適用
function applyAdvancedFilters(ctx, width, height) {
    // ノイズ除去フィルタ（中央値フィルタ）
    const imageData = ctx.getImageData(0, 0, width, height);
    const filteredData = applyMedianFilter(imageData.data, width, height);
    
    // 新しいImageDataオブジェクトを作成
    const newImageData = ctx.createImageData(width, height);
    newImageData.data.set(filteredData);
    ctx.putImageData(newImageData, 0, 0);
}

// 中央値フィルタによるノイズ除去
function applyMedianFilter(data, width, height, windowSize = 3) {
    const result = new Uint8ClampedArray(data);
    const halfWindow = Math.floor(windowSize / 2);
    
    for (let y = halfWindow; y < height - halfWindow; y++) {
        for (let x = halfWindow; x < width - halfWindow; x++) {
            const values = [];
            
            // ウィンドウ内の値を収集
            for (let dy = -halfWindow; dy <= halfWindow; dy++) {
                for (let dx = -halfWindow; dx <= halfWindow; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    const index = (ny * width + nx) * 4;
                    values.push(data[index]); // R値のみ使用（グレースケールなのでR=G=B）
                }
            }
            
            // 中央値を計算
            values.sort((a, b) => a - b);
            const median = values[Math.floor(values.length / 2)];
            
            // 結果に適用
            const index = (y * width + x) * 4;
            result[index] = median;     // Red
            result[index + 1] = median; // Green
            result[index + 2] = median; // Blue
            // Alphaはそのまま
        }
    }
    
    return result;
}

// AI強化OCRテキスト解析（最新版）
async function parseOCRTextWithAI(text, ocrResults, imageAnalysis) {
    console.log('AI-Enhanced OCR Analysis:', text);
    
    // Step 1: 高度なテキスト正規化
    const normalizedText = advancedNormalizeOCRText(text, imageAnalysis);
    const lines = normalizedText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    
    console.log('AI-Normalized lines:', lines);
    
    // Step 2: コンテクストアウェアなデータ抽出
    const extractedData = extractStructuredDataWithContext(lines, imageAnalysis);
    
    // Step 3: AIベースの信頼度スコアリング
    const scoredData = aiBasedScoring(extractedData, ocrResults, imageAnalysis);
    
    // Step 4: インテリジェントフォーム入力
    await intelligentFormFilling(scoredData, imageAnalysis);
    
    // Step 5: リアルタイムフィードバック
    displayEnhancedExtractionResults(scoredData, imageAnalysis);
}

// 高度なテキスト正規化（コンテクストアウェア）
function advancedNormalizeOCRText(text, analysis) {
    let normalized = text;
    
    // 画質に応じた正規化
    if (analysis.strategy.denoiseRequired) {
        // ノイズの多い画像の場合、より積極的なクリーニング
        normalized = normalized
            .replace(/[|\u2502\uff5c]/g, '') // 縦線文字の除去
            .replace(/[_\u2013\u2014\u2015]/g, '') // アンダースコア系の除去
            .replace(/[\u00a0\u2000-\u200a\u202f\u205f\u3000]/g, ' '); // 特殊空白の正規化
    }
    
    if (analysis.strategy.enhanceContrast) {
        // 低コントラスト画像の場合、誤認識しやすい文字を修正
        normalized = normalized
            .replace(/[Il1\u4e00]/g, function(match, offset, string) {
                // 文脈に基づいて数字か漢字かを判定
                const before = string.substring(Math.max(0, offset - 2), offset);
                const after = string.substring(offset + 1, offset + 3);
                
                if (/\d/.test(before) || /\d/.test(after)) {
                    return '1'; // 数字コンテキスト
                } else if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(before) || /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(after)) {
                    return '一'; // 日本語コンテキスト
                }
                return match;
            })
            .replace(/[O0〇]/g, function(match, offset, string) {
                const before = string.substring(Math.max(0, offset - 2), offset);
                const after = string.substring(offset + 1, offset + 3);
                
                if (/\d/.test(before) || /\d/.test(after)) {
                    return '0';
                }
                return match;
            });
    }
    
    // 基本的な正規化
    return normalized
        .replace(/[\uff01-\uff5e]/g, function(s) {
            return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
        })
        .replace(/\s+/g, ' ')
        .replace(/[\u3000]/g, ' ')
        .trim();
}

// コンテクストアウェアなデータ抽出
function extractStructuredDataWithContext(lines, analysis) {
    const data = extractStructuredData(lines); // 既存の関数を使用
    
    // 画質分析に基づく追加処理
    if (analysis.strategy.textDensity === 'high') {
        // 高密度テキストの場合、より細かく分析
        data.departments = enhanceDepartmentExtraction(lines);
        data.positions = enhancePositionExtraction(lines);
    }
    
    if (analysis.brightness < 120) {
        // 暗い画像の場合、より寛容なマッチング
        data.emails = enhanceEmailExtractionForDarkImages(lines);
        data.phones = enhancePhoneExtractionForDarkImages(lines);
    }
    
    return data;
}

// 部署抽出強化
function enhanceDepartmentExtraction(lines) {
    const departments = [];
    const departmentPatterns = [
        /([\u3042-\u3093\u30a2-\u30f3\u4e00-\u9faf]+(?:部|課|室|局|科|係|グループ|チーム|センター|本部))/g,
        /(\w+\s*(?:Department|Dept|Division|Section|Team|Group|Center))/gi
    ];
    
    lines.forEach((line, index) => {
        departmentPatterns.forEach(pattern => {
            const matches = line.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    departments.push({
                        original: line,
                        value: match.trim(),
                        type: 'department',
                        confidence: 0.8,
                        index
                    });
                });
            }
        });
    });
    
    return departments;
}

// 役職抽出強化
function enhancePositionExtraction(lines) {
    const positions = [];
    const positionPatterns = [
        /(代表取締役.*|取締役.*|執行役員.*)/g,
        /(社長|副社長|専務|常務|部長|課長|主任|係長|マネージャー|チーフ|リーダー)/g,
        /(CEO|CTO|CFO|COO|CIO|President|Vice President|Director|Senior Manager|Manager|Supervisor|Lead|Principal)/gi
    ];
    
    lines.forEach((line, index) => {
        positionPatterns.forEach(pattern => {
            const matches = line.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    positions.push({
                        original: line,
                        value: match.trim(),
                        type: 'position',
                        confidence: 0.85,
                        index
                    });
                });
            }
        });
    });
    
    return positions;
}

// 暗い画像用メール抽出強化
function enhanceEmailExtractionForDarkImages(lines) {
    const emails = [];
    const relaxedEmailPattern = /([a-zA-Z0-9._%-]+\s*@\s*[a-zA-Z0-9.-]+\s*\.\s*[a-zA-Z]{2,})/gi;
    
    lines.forEach((line, index) => {
        const matches = line.match(relaxedEmailPattern);
        if (matches) {
            matches.forEach(match => {
                const cleaned = match.replace(/\s/g, '');
                if (cleaned.includes('@') && cleaned.includes('.')) {
                    emails.push({
                        original: line,
                        value: cleaned,
                        type: 'email',
                        confidence: 0.8,
                        index
                    });
                }
            });
        }
    });
    
    return emails;
}

// 暗い画像用電話番号抽出強化
function enhancePhoneExtractionForDarkImages(lines) {
    const phones = [];
    const relaxedPhonePatterns = [
        /(\d{2,4}\s*[-‐‑‒–—―]?\s*\d{2,4}\s*[-‐‑‒–—―]?\s*\d{3,4})/g,
        /(TEL[:：\s]*\d[\d\s\-‐‑‒–—―]+)/gi
    ];
    
    lines.forEach((line, index) => {
        relaxedPhonePatterns.forEach(pattern => {
            const matches = line.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const cleaned = match.replace(/[^\d\-\(\)]/g, '');
                    const digits = cleaned.replace(/[^\d]/g, '');
                    
                    if (digits.length >= 10 && digits.length <= 11) {
                        phones.push({
                            original: line,
                            value: cleaned,
                            type: 'phone',
                            confidence: 0.75,
                            index
                        });
                    }
                });
            }
        });
    });
    
    return phones;
}

// AIベースの信頼度スコアリング
function aiBasedScoring(data, ocrResults, analysis) {
    const scored = {};
    
    Object.keys(data).forEach(key => {
        scored[key] = data[key].map(item => {
            // コンテキストスコア計算
            const contextScore = calculateItemContextScore(item, analysis);
            
            // OCR結果との整合性スコア
            const consistencyScore = calculateOCRConsistencyScore(item, ocrResults);
            
            // 最終信頼度スコア
            const finalConfidence = (item.confidence * 0.4) + (contextScore * 0.3) + (consistencyScore * 0.3);
            
            return {
                ...item,
                contextScore,
                consistencyScore,
                confidence: finalConfidence
            };
        }).sort((a, b) => b.confidence - a.confidence);
    });
    
    return scored;
}

// アイテムコンテキストスコア計算
function calculateItemContextScore(item, analysis) {
    let score = 0.5;
    
    // アイテムタイプに基づくコンテキスト判定
    if (item.type === 'name' && item.index <= 2) score += 0.3;
    if (item.type === 'company' && item.value.length > 5) score += 0.2;
    if (item.type === 'email' && item.value.includes('.')) score += 0.2;
    if (item.type === 'phone' && item.value.replace(/[^\d]/g, '').length >= 10) score += 0.2;
    
    // 画質分析に基づく調整
    if (analysis.strategy.textDensity === 'high' && item.type !== 'name') {
        score += 0.1;
    }
    
    if (analysis.brightness < 120 && item.confidence > 0.7) {
        score += 0.1; // 暗い画像で高信頼度の場合
    }
    
    return Math.min(score, 1.0);
}

// OCR結果整合性スコア計算
function calculateOCRConsistencyScore(item, ocrResults) {
    let score = 0.5;
    let occurrenceCount = 0;
    
    // 複数のOCR結果で同じ値が登場するかチェック
    ocrResults.forEach(result => {
        if (result.data.text.includes(item.value)) {
            occurrenceCount++;
            score += 0.1;
        }
    });
    
    // 複数のエンジンで確認された場合のボーナス
    if (occurrenceCount > 1) {
        score += 0.2;
    }
    
    return Math.min(score, 1.0);
}

// インテリジェントフォーム入力
async function intelligentFormFilling(scoredData, analysis) {
    const fillFieldIntelligently = (fieldId, items, minConfidence = 0.5) => {
        const field = document.getElementById(fieldId);
        if (!field || field.value) return;
        
        const bestItem = items.find(item => item.confidence >= minConfidence);
        if (bestItem) {
            field.value = bestItem.value;
            
            // 信頼度に応じた視覚的フィードバック
            if (bestItem.confidence >= 0.9) {
                field.style.backgroundColor = '#d1fae5'; // 濃い緑（高信頼度）
                field.style.borderColor = '#10b981';
                field.title = `高信頼度: ${Math.round(bestItem.confidence * 100)}%`;
            } else if (bestItem.confidence >= 0.7) {
                field.style.backgroundColor = '#fef3c7'; // 黄色（中信頼度）
                field.style.borderColor = '#f59e0b';
                field.title = `中信頼度: ${Math.round(bestItem.confidence * 100)}% - 確認してください`;
            } else {
                field.style.backgroundColor = '#fecaca'; // 赤（低信頼度）
                field.style.borderColor = '#ef4444';
                field.title = `低信頼度: ${Math.round(bestItem.confidence * 100)}% - 要確認`;
            }
        }
    };
    
    // 画質分析に応じた閾値調整
    const confidenceThresholds = {
        email: analysis.brightness > 150 ? 0.8 : 0.6,
        phone: analysis.strategy.denoiseRequired ? 0.6 : 0.7,
        company: analysis.strategy.textDensity === 'high' ? 0.5 : 0.6,
        name: analysis.strategy.enhanceContrast ? 0.4 : 0.5,
        position: 0.6,
        department: 0.6
    };
    
    // 各フィールドにインテリジェント入力
    fillFieldIntelligently('email', scoredData.emails, confidenceThresholds.email);
    fillFieldIntelligently('phone', scoredData.phones, confidenceThresholds.phone);
    fillFieldIntelligently('company', scoredData.companies, confidenceThresholds.company);
    fillFieldIntelligently('position', scoredData.positions, confidenceThresholds.position);
    fillFieldIntelligently('department', scoredData.departments, confidenceThresholds.department);
    fillFieldIntelligently('name', scoredData.names, confidenceThresholds.name);
    
    // 住所の特別処理
    if (scoredData.addresses.length > 0 && !document.getElementById('address').value) {
        const addressField = document.getElementById('address');
        const bestAddresses = scoredData.addresses
            .filter(addr => addr.confidence > 0.5)
            .slice(0, 2)
            .map(addr => addr.value);
        
        if (bestAddresses.length > 0) {
            addressField.value = bestAddresses.join('\n');
            addressField.style.backgroundColor = '#fef3c7';
            addressField.title = `住所情報 - 確認してください`;
        }
    }
}

// 拡張結果表示
function displayEnhancedExtractionResults(scoredData, analysis) {
    console.log('Enhanced Extraction Results:', scoredData);
    
    // 統計情報の表示
    const totalItems = Object.values(scoredData).flat().length;
    const highConfidenceItems = Object.values(scoredData).flat().filter(item => item.confidence > 0.8).length;
    const mediumConfidenceItems = Object.values(scoredData).flat().filter(item => item.confidence > 0.6 && item.confidence <= 0.8).length;
    
    console.log(`抽出結果統計: 合計${totalItems}件, 高信頼度${highConfidenceItems}件, 中信頼度${mediumConfidenceItems}件`);
    
    // ユーザーへのフィードバック
    const successRate = totalItems > 0 ? ((highConfidenceItems + mediumConfidenceItems) / totalItems) * 100 : 0;
    
    if (successRate > 80) {
        showToast(`OCR精度が非常に高いです（${Math.round(successRate)}%）`, 'success');
    } else if (successRate > 60) {
        showToast(`OCR精度は良好です（${Math.round(successRate)}%） - 黄色フィールドを確認してください`, 'info');
    } else {
        showToast(`OCR精度が低いです（${Math.round(successRate)}%） - 赤色フィールドを特に確認してください`, 'warning');
    }
    
    // 画質分析結果も表示
    console.log('画質分析結果:', {
        brightness: Math.round(analysis.brightness),
        contrast: Math.round(analysis.contrast),
        sharpness: Math.round(analysis.sharpness * 10) / 10,
        noise: Math.round(analysis.noise * 10) / 10,
        strategy: analysis.strategy
    });
}

// 新しい前処理関数群

// 明度補正前処理
async function preprocessImageBrightnessCorrection(file, analysis) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            const scaleFactor = 2.5;
            canvas.width = img.width * scaleFactor;
            canvas.height = img.height * scaleFactor;
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // 明度補正係数計算
            const targetBrightness = 140;
            const brightnessFactor = targetBrightness / analysis.brightness;
            
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, data[i] * brightnessFactor);     // R
                data[i + 1] = Math.min(255, data[i + 1] * brightnessFactor); // G
                data[i + 2] = Math.min(255, data[i + 2] * brightnessFactor); // B
            }
            
            ctx.putImageData(imageData, 0, 0);
            canvas.toBlob(resolve, 'image/png', 1.0);
        };
        
        img.src = URL.createObjectURL(file);
    });
}

// 高度コントラスト前処理
async function preprocessImageAdvancedContrast(file, analysis) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            const scaleFactor = 2.8;
            canvas.width = img.width * scaleFactor;
            canvas.height = img.height * scaleFactor;
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // CLAHE (Contrast Limited Adaptive Histogram Equalization) 簡易版
            applyCLAHE(data, canvas.width, canvas.height);
            
            ctx.putImageData(imageData, 0, 0);
            canvas.toBlob(resolve, 'image/png', 1.0);
        };
        
        img.src = URL.createObjectURL(file);
    });
}

// CLAHEアルゴリズム簡易実装
function applyCLAHE(data, width, height) {
    const tileSize = 32;
    const clipLimit = 2.0;
    
    for (let tY = 0; tY < height; tY += tileSize) {
        for (let tX = 0; tX < width; tX += tileSize) {
            const tileWidth = Math.min(tileSize, width - tX);
            const tileHeight = Math.min(tileSize, height - tY);
            
            // タイル内のヒストグラム作成
            const histogram = new Array(256).fill(0);
            
            for (let y = tY; y < tY + tileHeight; y++) {
                for (let x = tX; x < tX + tileWidth; x++) {
                    const idx = (y * width + x) * 4;
                    const gray = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
                    histogram[gray]++;
                }
            }
            
            // クリップ限界適用
            const totalPixels = tileWidth * tileHeight;
            const maxCount = Math.floor(totalPixels / 256 * clipLimit);
            
            let excess = 0;
            for (let i = 0; i < 256; i++) {
                if (histogram[i] > maxCount) {
                    excess += histogram[i] - maxCount;
                    histogram[i] = maxCount;
                }
            }
            
            // 余剰を均等配分
            const redistribute = Math.floor(excess / 256);
            for (let i = 0; i < 256; i++) {
                histogram[i] += redistribute;
            }
            
            // 累積分布関数作成
            const cdf = new Array(256);
            cdf[0] = histogram[0];
            for (let i = 1; i < 256; i++) {
                cdf[i] = cdf[i - 1] + histogram[i];
            }
            
            // 正規化
            for (let i = 0; i < 256; i++) {
                cdf[i] = Math.round((cdf[i] / totalPixels) * 255);
            }
            
            // タイルに適用
            for (let y = tY; y < tY + tileHeight; y++) {
                for (let x = tX; x < tX + tileWidth; x++) {
                    const idx = (y * width + x) * 4;
                    const gray = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
                    const newGray = cdf[gray];
                    
                    data[idx] = newGray;
                    data[idx + 1] = newGray;
                    data[idx + 2] = newGray;
                }
            }
        }
    }
}

// 高度ノイズ除去前処理
async function preprocessImageAdvancedDenoise(file, analysis) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            const scaleFactor = 2.5;
            canvas.width = img.width * scaleFactor;
            canvas.height = img.height * scaleFactor;
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // ガウシアンフィルタ + バイラテラルフィルタ組み合わせ
            const denoised = applyBilateralFilter(data, canvas.width, canvas.height);
            
            const newImageData = ctx.createImageData(canvas.width, canvas.height);
            newImageData.data.set(denoised);
            ctx.putImageData(newImageData, 0, 0);
            
            canvas.toBlob(resolve, 'image/png', 1.0);
        };
        
        img.src = URL.createObjectURL(file);
    });
}

// バイラテラルフィルタ簡易実装
function applyBilateralFilter(data, width, height) {
    const result = new Uint8ClampedArray(data);
    const windowSize = 5;
    const halfWindow = Math.floor(windowSize / 2);
    const sigmaColor = 20;
    const sigmaSpace = 20;
    
    for (let y = halfWindow; y < height - halfWindow; y++) {
        for (let x = halfWindow; x < width - halfWindow; x++) {
            const centerIdx = (y * width + x) * 4;
            const centerGray = 0.299 * data[centerIdx] + 0.587 * data[centerIdx + 1] + 0.114 * data[centerIdx + 2];
            
            let sumWeight = 0;
            let sumR = 0, sumG = 0, sumB = 0;
            
            for (let dy = -halfWindow; dy <= halfWindow; dy++) {
                for (let dx = -halfWindow; dx <= halfWindow; dx++) {
                    const neighborIdx = ((y + dy) * width + (x + dx)) * 4;
                    const neighborGray = 0.299 * data[neighborIdx] + 0.587 * data[neighborIdx + 1] + 0.114 * data[neighborIdx + 2];
                    
                    // 空間的近さの重み
                    const spatialWeight = Math.exp(-(dx * dx + dy * dy) / (2 * sigmaSpace * sigmaSpace));
                    
                    // 色の近さの重み
                    const colorWeight = Math.exp(-Math.pow(centerGray - neighborGray, 2) / (2 * sigmaColor * sigmaColor));
                    
                    const weight = spatialWeight * colorWeight;
                    
                    sumWeight += weight;
                    sumR += data[neighborIdx] * weight;
                    sumG += data[neighborIdx + 1] * weight;
                    sumB += data[neighborIdx + 2] * weight;
                }
            }
            
            if (sumWeight > 0) {
                result[centerIdx] = sumR / sumWeight;
                result[centerIdx + 1] = sumG / sumWeight;
                result[centerIdx + 2] = sumB / sumWeight;
            }
        }
    }
    
    return result;
}

// 高度シャープネス強化前処理
async function preprocessImageAdvancedSharpen(file, analysis) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            const scaleFactor = 3;
            canvas.width = img.width * scaleFactor;
            canvas.height = img.height * scaleFactor;
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // アンシャープマスク適用
            const sharpened = applyUnsharpMask(data, canvas.width, canvas.height);
            
            const newImageData = ctx.createImageData(canvas.width, canvas.height);
            newImageData.data.set(sharpened);
            ctx.putImageData(newImageData, 0, 0);
            
            canvas.toBlob(resolve, 'image/png', 1.0);
        };
        
        img.src = URL.createObjectURL(file);
    });
}

// アンシャープマスク実装
function applyUnsharpMask(data, width, height) {
    const result = new Uint8ClampedArray(data);
    const amount = 1.2; // 強化率
    const threshold = 5; // 闾値
    
    // ガウシアンブラーを適用してベース画像を作成
    const blurred = applyGaussianBlur(data, width, height, 1.0);
    
    // アンシャープマスクを適用
    for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) { // RGBチャンネル
            const original = data[i + c];
            const blur = blurred[i + c];
            const difference = original - blur;
            
            if (Math.abs(difference) > threshold) {
                result[i + c] = Math.max(0, Math.min(255, original + difference * amount));
            } else {
                result[i + c] = original;
            }
        }
    }
    
    return result;
}

// ガウシアンブラー実装
function applyGaussianBlur(data, width, height, sigma) {
    const result = new Uint8ClampedArray(data);
    const kernelSize = Math.ceil(sigma * 3) * 2 + 1;
    const halfKernel = Math.floor(kernelSize / 2);
    
    // ガウシアンカーネル作成
    const kernel = [];
    let kernelSum = 0;
    
    for (let i = 0; i < kernelSize; i++) {
        const x = i - halfKernel;
        const value = Math.exp(-(x * x) / (2 * sigma * sigma));
        kernel[i] = value;
        kernelSum += value;
    }
    
    // 正規化
    for (let i = 0; i < kernelSize; i++) {
        kernel[i] /= kernelSum;
    }
    
    // 水平ブラー
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const centerIdx = (y * width + x) * 4;
            
            for (let c = 0; c < 3; c++) {
                let sum = 0;
                
                for (let k = 0; k < kernelSize; k++) {
                    const offsetX = x + k - halfKernel;
                    const clampedX = Math.max(0, Math.min(width - 1, offsetX));
                    const idx = (y * width + clampedX) * 4;
                    sum += data[idx + c] * kernel[k];
                }
                
                result[centerIdx + c] = sum;
            }
        }
    }
    
    // 垂直ブラー
    const temp = new Uint8ClampedArray(result);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const centerIdx = (y * width + x) * 4;
            
            for (let c = 0; c < 3; c++) {
                let sum = 0;
                
                for (let k = 0; k < kernelSize; k++) {
                    const offsetY = y + k - halfKernel;
                    const clampedY = Math.max(0, Math.min(height - 1, offsetY));
                    const idx = (clampedY * width + x) * 4;
                    sum += temp[idx + c] * kernel[k];
                }
                
                result[centerIdx + c] = sum;
            }
        }
    }
    
    return result;
}

// 高密度テキスト特化前処理
async function preprocessImageHighDensityText(file, analysis) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            const scaleFactor = 3.5; // 高密度テキストはさらに高解像度化
            canvas.width = img.width * scaleFactor;
            canvas.height = img.height * scaleFactor;
            
            ctx.imageSmoothingEnabled = false;
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // テキスト領域検出と特化処理
            applyTextSpecificEnhancements(data, canvas.width, canvas.height);
            
            ctx.putImageData(imageData, 0, 0);
            canvas.toBlob(resolve, 'image/png', 1.0);
        };
        
        img.src = URL.createObjectURL(file);
    });
}

// テキスト特化強化処理
function applyTextSpecificEnhancements(data, width, height) {
    // エッジ保存バイラテラルフィルタ
    const filtered = applyEdgePreservingFilter(data, width, height);
    
    // テキストライン強化
    const enhanced = enhanceTextLines(filtered, width, height);
    
    // 結果を元の配列にコピー
    for (let i = 0; i < data.length; i++) {
        data[i] = enhanced[i];
    }
}

// エッジ保存フィルタ
function applyEdgePreservingFilter(data, width, height) {
    const result = new Uint8ClampedArray(data);
    const windowSize = 3;
    const halfWindow = 1;
    const threshold = 30;
    
    for (let y = halfWindow; y < height - halfWindow; y++) {
        for (let x = halfWindow; x < width - halfWindow; x++) {
            const centerIdx = (y * width + x) * 4;
            const centerGray = 0.299 * data[centerIdx] + 0.587 * data[centerIdx + 1] + 0.114 * data[centerIdx + 2];
            
            let count = 0;
            let sumR = 0, sumG = 0, sumB = 0;
            
            for (let dy = -halfWindow; dy <= halfWindow; dy++) {
                for (let dx = -halfWindow; dx <= halfWindow; dx++) {
                    const neighborIdx = ((y + dy) * width + (x + dx)) * 4;
                    const neighborGray = 0.299 * data[neighborIdx] + 0.587 * data[neighborIdx + 1] + 0.114 * data[neighborIdx + 2];
                    
                    // エッジでなければ平均化
                    if (Math.abs(centerGray - neighborGray) < threshold) {
                        count++;
                        sumR += data[neighborIdx];
                        sumG += data[neighborIdx + 1];
                        sumB += data[neighborIdx + 2];
                    }
                }
            }
            
            if (count > 0) {
                result[centerIdx] = sumR / count;
                result[centerIdx + 1] = sumG / count;
                result[centerIdx + 2] = sumB / count;
            }
        }
    }
    
    return result;
}

// テキストライン強化
function enhanceTextLines(data, width, height) {
    const result = new Uint8ClampedArray(data);
    
    // 水平方向のエッジ強化（テキストライン検出）
    const horizontalKernel = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const centerIdx = (y * width + x) * 4;
            
            let gradient = 0;
            let kernelIndex = 0;
            
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const idx = ((y + dy) * width + (x + dx)) * 4;
                    const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                    gradient += gray * horizontalKernel[kernelIndex];
                    kernelIndex++;
                }
            }
            
            // 強いエッジの場合、コントラストを強化
            if (Math.abs(gradient) > 50) {
                const originalGray = 0.299 * data[centerIdx] + 0.587 * data[centerIdx + 1] + 0.114 * data[centerIdx + 2];
                const enhanced = originalGray > 128 ? 255 : 0;
                
                result[centerIdx] = enhanced;
                result[centerIdx + 1] = enhanced;
                result[centerIdx + 2] = enhanced;
            }
        }
    }
    
    return result;
}

// OCRテキストの正規化
function normalizeOCRText(text) {
    return text
        // 全角英数字を半角に変換
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
            return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
        })
        // 全角記号を半角に変換
        .replace(/[！-～]/g, function(s) {
            return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
        })
        // 重複する空白を除去
        .replace(/\s+/g, ' ')
        // 不要な記号を整理
        .replace(/[|｜]/g, '')
        .replace(/[・]/g, ' ')
        // OCRによる誤認識の修正
        .replace(/0/g, 'O').replace(/O(?=\d)/g, '0') // 文脈による0とOの修正
        .replace(/1/g, 'l').replace(/l(?=\d)/g, '1') // 文脈による1とlの修正
        .trim();
}

// 構造化データ抽出
function extractStructuredData(lines) {
    const data = {
        names: [],
        companies: [],
        departments: [],
        positions: [],
        emails: [],
        phones: [],
        addresses: [],
        urls: [],
        others: []
    };
    
    lines.forEach((line, index) => {
        const lineData = {
            original: line,
            index,
            confidence: 0,
            type: 'unknown'
        };
        
        // メールアドレス検出（改良版）
        const emailMatches = line.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g);
        if (emailMatches) {
            emailMatches.forEach(email => {
                data.emails.push({ ...lineData, value: email, type: 'email', confidence: 0.9 });
            });
        }
        
        // 電話番号検出（改良版）
        const phonePatterns = [
            /(\d{2,4}[-\s]?\d{2,4}[-\s]?\d{3,4})/g,
            /(\(\d{2,4}\)\s*\d{2,4}[-\s]?\d{3,4})/g,
            /(TEL[:\s]*\d{2,4}[-\s]?\d{2,4}[-\s]?\d{3,4})/gi,
            /(\d{3}-\d{4}-\d{4})/g
        ];
        
        phonePatterns.forEach(pattern => {
            const phoneMatches = line.match(pattern);
            if (phoneMatches) {
                phoneMatches.forEach(phone => {
                    const cleanPhone = phone.replace(/[^\d\-\(\)]/g, '');
                    if (cleanPhone.replace(/[\-\(\)]/g, '').length >= 10) {
                        data.phones.push({ ...lineData, value: cleanPhone, type: 'phone', confidence: 0.85 });
                    }
                });
            }
        });
        
        // URL検出
        const urlMatch = line.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/g);
        if (urlMatch) {
            urlMatch.forEach(url => {
                data.urls.push({ ...lineData, value: url, type: 'url', confidence: 0.8 });
            });
        }
        
        // 住所検出（改良版）
        if (line.match(/[都道府県][市区町村]|[0-9]+[-－][0-9]+[-－][0-9]+|[丁目番地号]/)) {
            data.addresses.push({ ...lineData, value: line, type: 'address', confidence: 0.7 });
        }
        
        // 会社名検出（改良版）
        const companyPatterns = [
            /(.*(?:株式会社|有限会社|合同会社|合資会社|合名会社).*)/,
            /(.*(?:Corporation|Corp|Inc|Ltd|Co\.|Company|LLC).*)/i,
            /(.*(?:財団法人|社団法人|学校法人|医療法人|宗教法人).*)/
        ];
        
        companyPatterns.forEach(pattern => {
            const companyMatch = line.match(pattern);
            if (companyMatch) {
                data.companies.push({ ...lineData, value: companyMatch[1].trim(), type: 'company', confidence: 0.8 });
            }
        });
        
        // 役職検出（改良版）
        const positionPatterns = [
            /(代表取締役.*|取締役.*|執行役員.*)/,
            /(社長|副社長|専務|常務|部長|課長|係長|主任|チーフ|リーダー|マネージャー)/,
            /(CEO|CTO|CFO|COO|CIO|President|Director|Manager|Senior|Junior)/i,
            /(教授|准教授|講師|助教|研究員)/
        ];
        
        positionPatterns.forEach(pattern => {
            const positionMatch = line.match(pattern);
            if (positionMatch) {
                data.positions.push({ ...lineData, value: positionMatch[1] || positionMatch[0], type: 'position', confidence: 0.75 });
            }
        });
        
        // 部署検出（改良版）
        if (line.match(/[部課室局科係チーム]$/)) {
            data.departments.push({ ...lineData, value: line, type: 'department', confidence: 0.7 });
        }
        
        // 人名検出（改良版）
        if (index < 5 && // 上位5行以内
            !line.match(/(?:株式会社|有限会社|合同会社|Corporation|Corp|Inc|Ltd|@|https?:|www\.|TEL|FAX|\d{3}-\d{4})/i) &&
            line.length >= 2 && line.length <= 25 &&
            line.match(/^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3005\u3007\u303Ba-zA-Z\s]+$/)) { // ひらがな、カタカナ、漢字、英字のみ
            
            const nameConfidence = calculateNameConfidence(line, index);
            if (nameConfidence > 0.5) {
                data.names.push({ ...lineData, value: line, type: 'name', confidence: nameConfidence });
            }
        }
        
        // その他の情報
        if (line.length > 3 && !isProcessedLine(line, data)) {
            data.others.push({ ...lineData, value: line, type: 'other', confidence: 0.3 });
        }
    });
    
    return data;
}

// 名前の信頼度計算
function calculateNameConfidence(line, index) {
    let confidence = 0.5;
    
    // 位置による加点
    if (index === 0) confidence += 0.3;
    else if (index <= 2) confidence += 0.2;
    
    // 長さによる調整
    if (line.length >= 2 && line.length <= 8) confidence += 0.1;
    else if (line.length > 8) confidence -= 0.2;
    
    // 日本の名前パターン
    if (line.match(/^[\u4E00-\u9FAF]{1,4}\s*[\u4E00-\u9FAF]{1,4}$/)) confidence += 0.2;
    if (line.match(/^[A-Z][a-z]+\s+[A-Z][a-z]+$/)) confidence += 0.2;
    
    return Math.min(confidence, 1.0);
}

// 処理済み行の判定
function isProcessedLine(line, data) {
    const allProcessed = [
        ...data.emails, ...data.phones, ...data.urls, 
        ...data.addresses, ...data.companies, ...data.positions, 
        ...data.departments, ...data.names
    ];
    
    return allProcessed.some(item => 
        item.original === line || 
        line.includes(item.value) || 
        item.value.includes(line)
    );
}

// 抽出データのスコアリング
function scoreExtractedData(data, ocrResults) {
    const scored = {};
    
    Object.keys(data).forEach(key => {
        scored[key] = data[key]
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 3); // 上位3件まで
    });
    
    return scored;
}

// 信頼度付きフォーム入力
async function fillFormFieldsWithConfidence(scoredData) {
    const fillField = (fieldId, items, minConfidence = 0.6) => {
        const field = document.getElementById(fieldId);
        if (!field || field.value) return; // 既に値が入っている場合はスキップ
        
        const bestItem = items.find(item => item.confidence >= minConfidence);
        if (bestItem) {
            field.value = bestItem.value;
            // 信頼度が低い場合は背景色を変更
            if (bestItem.confidence < 0.8) {
                field.style.backgroundColor = '#fef3c7'; // 薄い黄色
                field.title = `信頼度: ${Math.round(bestItem.confidence * 100)}%`;
            }
        }
    };
    
    // 各フィールドに自動入力
    fillField('email', scoredData.emails, 0.8);
    fillField('phone', scoredData.phones, 0.7);
    fillField('company', scoredData.companies, 0.6);
    fillField('position', scoredData.positions, 0.6);
    fillField('department', scoredData.departments, 0.6);
    fillField('name', scoredData.names, 0.5);
    
    // 住所の特別処理
    if (scoredData.addresses.length > 0 && !document.getElementById('address').value) {
        const addressText = scoredData.addresses
            .slice(0, 2)
            .map(item => item.value)
            .join('\n');
        document.getElementById('address').value = addressText;
    }
}

// 抽出結果の表示
function displayExtractionResults(scoredData) {
    console.log('Extraction Results:', scoredData);
    
    // 信頼度の低い項目について通知
    const lowConfidenceItems = [];
    Object.values(scoredData).flat()
        .filter(item => item.confidence > 0.3 && item.confidence < 0.7)
        .forEach(item => lowConfidenceItems.push(`${item.type}: ${item.value} (${Math.round(item.confidence * 100)}%)`));
    
    if (lowConfidenceItems.length > 0) {
        console.log('低信頼度項目:', lowConfidenceItems);
        showToast('一部の項目は確認が必要です（黄色背景）', 'warning');
    }
}

// Save business card
async function saveBusinessCard(event) {
    event.preventDefault();
    
    const saveBtn = document.getElementById('saveBtn');
    const originalText = saveBtn.innerHTML;
    
    try {
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>保存中...';
        saveBtn.disabled = true;
        
        // Upload image first if there's a new image
        let imageId = currentImageId;
        
        if (currentImageFile) {
            const formData = new FormData();
            formData.append('image', currentImageFile);
            
            const imageResponse = await axios.post('/api/images/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            if (imageResponse.data.success) {
                imageId = imageResponse.data.data.id;
            } else {
                throw new Error('画像のアップロードに失敗しました');
            }
        }
        
        // Prepare business card data
        const formData = new FormData(event.target);
        const businessCardData = {
            name: formData.get('name'),
            company: formData.get('company'),
            department: formData.get('department') || null,
            position: formData.get('position') || null,
            email: formData.get('email') || null,
            phone: formData.get('phone') || null,
            address: formData.get('address') || null,
            notes: formData.get('notes') || null,
            category_id: formData.get('category_id') ? parseInt(formData.get('category_id')) : null,
            image_id: imageId || null
        };
        
        let response;
        
        if (isEditing) {
            response = await axios.put(`/api/business-cards/${currentEditId}`, businessCardData);
        } else {
            response = await axios.post('/api/business-cards', businessCardData);
        }
        
        if (response.data.success) {
            showToast(isEditing ? '名刺を更新しました' : '名刺を追加しました', 'success');
            closeBusinessCardModal();
            loadBusinessCards(currentPage);
        } else {
            throw new Error(response.data.error || '保存に失敗しました');
        }
        
    } catch (error) {
        console.error('Save error:', error);
        showToast(error.message || '保存に失敗しました', 'error');
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// Edit business card
async function editBusinessCard(id) {
    try {
        const response = await axios.get(`/api/business-cards/${id}`);
        
        if (response.data.success) {
            openBusinessCardModal(response.data.data);
        } else {
            throw new Error(response.data.error || '名刺の読み込みに失敗しました');
        }
    } catch (error) {
        console.error('Edit error:', error);
        showToast(error.message || '名刺の読み込みに失敗しました', 'error');
    }
}

// Delete business card
async function deleteBusinessCard(id) {
    if (!confirm('この名刺を削除してもよろしいですか？')) {
        return;
    }
    
    try {
        const response = await axios.delete(`/api/business-cards/${id}`);
        
        if (response.data.success) {
            showToast('名刺を削除しました', 'success');
            loadBusinessCards(currentPage);
        } else {
            throw new Error(response.data.error || '削除に失敗しました');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showToast(error.message || '削除に失敗しました', 'error');
    }
}

// Category management
function openCategoryModal() {
    const modal = document.getElementById('categoryModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        loadCategoriesList();
    }
}

function closeCategoryModal() {
    const modal = document.getElementById('categoryModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
}

async function saveCategory(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const categoryData = {
        name: formData.get('name') || document.getElementById('categoryName').value,
        color: formData.get('color') || document.getElementById('categoryColor').value,
        description: formData.get('description') || document.getElementById('categoryDescription').value
    };
    
    try {
        const response = await axios.post('/api/categories', categoryData);
        
        if (response.data.success) {
            showToast('カテゴリを追加しました', 'success');
            document.getElementById('categoryForm').reset();
            document.getElementById('categoryColor').value = '#3B82F6';
            loadCategories();
        } else {
            throw new Error(response.data.error || 'カテゴリの保存に失敗しました');
        }
    } catch (error) {
        console.error('Category save error:', error);
        showToast(error.message || 'カテゴリの保存に失敗しました', 'error');
    }
}

function loadCategoriesList() {
    const categoryItems = document.getElementById('categoryItems');
    if (!categoryItems) return;
    
    if (categories.length === 0) {
        categoryItems.innerHTML = '<p class="text-gray-500 text-center py-4">カテゴリはまだありません</p>';
        return;
    }
    
    categoryItems.innerHTML = categories.map(category => `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div class="flex items-center space-x-3">
                <div class="w-4 h-4 rounded-full" style="background-color: ${category.color}"></div>
                <div>
                    <div class="font-medium text-gray-900">${escapeHtml(category.name)}</div>
                    ${category.description ? `<div class="text-sm text-gray-500">${escapeHtml(category.description)}</div>` : ''}
                    <div class="text-xs text-gray-400">${category.business_card_count || 0} 枚の名刺</div>
                </div>
            </div>
            <button onclick="deleteCategory(${category.id})" class="text-red-600 hover:text-red-800 p-2">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

async function deleteCategory(id) {
    const category = categories.find(c => c.id === id);
    
    if (category && category.business_card_count > 0) {
        if (!confirm(`このカテゴリには${category.business_card_count}枚の名刺が関連付けられています。削除してもよろしいですか？`)) {
            return;
        }
    } else {
        if (!confirm('このカテゴリを削除してもよろしいですか？')) {
            return;
        }
    }
    
    try {
        const response = await axios.delete(`/api/categories/${id}`);
        
        if (response.data.success) {
            showToast('カテゴリを削除しました', 'success');
            loadCategories();
        } else {
            throw new Error(response.data.error || 'カテゴリの削除に失敗しました');
        }
    } catch (error) {
        console.error('Category delete error:', error);
        showToast(error.message || 'カテゴリの削除に失敗しました', 'error');
    }
}

// Utility functions
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}