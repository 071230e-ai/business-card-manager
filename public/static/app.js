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

// OCR functionality with enhanced image preprocessing
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
        showToast('画像を前処理中...', 'info');
        
        // 画像前処理を実行
        const preprocessedImage = await preprocessImageForOCR(currentImageFile);
        
        showToast('OCR処理を開始します...', 'info');
        
        // Tesseract.jsの設定を最適化
        const { data: { text } } = await Tesseract.recognize(preprocessedImage, 'jpn+eng', {
            logger: m => {
                if (m.status === 'recognizing text') {
                    console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                }
            },
            // OCR精度を向上させるオプション
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン一二三四五六七八九十百千万億兆京垓株式会社有限会社合同会社財団法人社団法人部長課長主任係長取締役社長専務常務部課室局科係グループチーム営業総務人事経理財務企画開発技術情報システム品質管理製造生産物流購買調達広告宣伝マーケティングデザイン建設工事設計施工監理電気機械土木建築環境安全衛生法務知的財産特許商標著作権ライセンス契約交渉企業経営戦略企画立案実行監督指導教育研修訓練評価改善提案相談支援協力連携提携業務委託外注下請孫請元請prime主契約副契約準委任請負売買賃貸借委任寄託保証連帯債務不動産動産知識技術技能経験実績成果業績評価査定昇進昇格降格転職退職採用募集求人応募面接選考合格不合格内定承諾辞退入社退社配属異動転勤出向転籍派遣契約正社員契約社員嘱託パート非常勤アルバイト派遣社員業務委託フリーランス個人事業主法人企業組織団体機関施設事業所営業所支店支社本店本社工場研究所開発センター技術センター設計事務所コンサルタント@.-()[]{}+*#&%$!?,:;\'"',
            tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
            preserve_interword_spaces: '1'
        });
        
        console.log('OCR結果:', text);
        
        if (text.trim()) {
            parseOCRText(text);
            showToast('OCR処理が完了しました', 'success');
        } else {
            showToast('テキストを認識できませんでした', 'warning');
        }
    } catch (error) {
        console.error('OCR Error:', error);
        showToast('OCR処理に失敗しました', 'error');
    } finally {
        if (ocrProgress) {
            ocrProgress.classList.add('hidden');
        }
    }
}

// 画像前処理関数（OCR精度向上のため）
async function preprocessImageForOCR(file) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            // キャンバスのサイズを設定（高解像度化）
            const scaleFactor = 2; // 2倍にリサイズ
            canvas.width = img.width * scaleFactor;
            canvas.height = img.height * scaleFactor;
            
            // 高品質スケーリング
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // 白背景を設定
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // 画像を描画
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // 画像データを取得
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // グレースケール変換とコントラスト調整
            for (let i = 0; i < data.length; i += 4) {
                // グレースケール変換
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                
                // コントラスト強化（しきい値処理）
                const threshold = 128;
                const enhanced = gray > threshold ? 255 : 0;
                
                data[i] = enhanced;     // Red
                data[i + 1] = enhanced; // Green
                data[i + 2] = enhanced; // Blue
                // Alpha（透明度）はそのまま
            }
            
            // 処理した画像データをキャンバスに適用
            ctx.putImageData(imageData, 0, 0);
            
            // Blobとして出力
            canvas.toBlob(resolve, 'image/png', 1.0);
        };
        
        img.src = URL.createObjectURL(file);
    });
}

function parseOCRText(text) {
    console.log('OCR Result:', text);
    
    // Clean up the text
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Enhanced parsing logic for Japanese business cards
    lines.forEach((line, index) => {
        // Email pattern (improved)
        const emailMatch = line.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch && !document.getElementById('email').value) {
            document.getElementById('email').value = emailMatch[1];
            return;
        }
        
        // Phone pattern (Japanese format, improved)
        const phoneMatch = line.match(/((?:\d{2,4}[-\s]?\d{2,4}[-\s]?\d{3,4})|(?:\(\d{2,4}\)[-\s]?\d{2,4}[-\s]?\d{3,4}))/);
        if (phoneMatch && phoneMatch[1].replace(/[\s\-\(\)]/g, '').length >= 10) {
            const phone = phoneMatch[1].trim();
            if (!document.getElementById('phone').value) {
                document.getElementById('phone').value = phone;
                return;
            }
        }
        
        // Address pattern (containing 県, 市, 区, 町, etc.)
        if (line.match(/[県市区町村]/)) {
            const currentAddress = document.getElementById('address').value;
            if (!currentAddress) {
                document.getElementById('address').value = line;
            } else {
                document.getElementById('address').value = currentAddress + '\\n' + line;
            }
            return;
        }
        
        // Company name (often contains 株式会社, 有限会社, etc.)
        if (line.match(/(株式会社|有限会社|合同会社|合資会社|合名会社|Corporation|Corp|Inc|Ltd|Co\.|Company)/)) {
            if (!document.getElementById('company').value) {
                document.getElementById('company').value = line;
            }
            return;
        }
        
        // Position/Title (containing common Japanese titles)
        if (line.match(/(代表取締役|取締役|社長|専務|常務|部長|課長|係長|主任|マネージャー|Manager|Director|President|CEO|CTO|CIO|CFO|COO)/)) {
            if (!document.getElementById('position').value) {
                document.getElementById('position').value = line;
            }
            return;
        }
        
        // Department (containing 部, 課, etc.)
        if (line.match(/[部課室局]/)) {
            if (!document.getElementById('department').value) {
                document.getElementById('department').value = line;
            }
            return;
        }
        
        // Name (typically the first clean line that's not a company)
        if (index < 3 && !document.getElementById('name').value && 
            !line.match(/(株式会社|有限会社|Corporation|Corp|Inc|Ltd|@|[\d\-\(\)]{6,})/) &&
            line.length >= 2 && line.length <= 20) {
            document.getElementById('name').value = line;
            return;
        }
    });
    
    // If company is still empty, try to use the first substantial line
    if (!document.getElementById('company').value && lines.length > 0) {
        const potentialCompany = lines.find(line => line.length > 3 && !line.match(/[@\\d\\-\\(\\)]/));
        if (potentialCompany) {
            document.getElementById('company').value = potentialCompany;
        }
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