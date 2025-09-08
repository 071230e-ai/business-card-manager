// 名刺管理システム - フロントエンド JavaScript

class BusinessCardManager {
  constructor() {
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.totalItems = 0;
    this.currentFilters = {};
    this.currentEditingId = null;
    this.categories = [];
    this.cameraStream = null;
    this.currentImageFilename = null;
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadCategories();
    this.loadBusinessCards();
  }

  bindEvents() {
    // 検索・フィルタイベント
    document.getElementById('search-input').addEventListener('input', this.debounce(() => {
      this.applyFilters();
    }, 300));

    document.getElementById('company-filter').addEventListener('input', this.debounce(() => {
      this.applyFilters();
    }, 300));

    document.getElementById('category-filter').addEventListener('change', () => {
      this.applyFilters();
    });

    document.getElementById('clear-filters-btn').addEventListener('click', () => {
      this.clearFilters();
    });

    // モーダルイベント
    document.getElementById('add-card-btn').addEventListener('click', () => {
      this.openModal();
    });

    document.getElementById('close-modal').addEventListener('click', () => {
      this.closeModal();
    });

    document.getElementById('cancel-btn').addEventListener('click', () => {
      this.closeModal();
    });

    document.getElementById('card-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveBusinessCard();
    });

    document.getElementById('delete-btn').addEventListener('click', () => {
      this.deleteBusinessCard();
    });

    // 画像アップロード関連イベント
    document.getElementById('file-upload-btn').addEventListener('click', () => {
      document.getElementById('image-file-input').click();
    });

    document.getElementById('image-file-input').addEventListener('change', (e) => {
      this.handleFileUpload(e.target.files[0]);
    });

    document.getElementById('camera-btn').addEventListener('click', () => {
      this.startCamera();
    });

    document.getElementById('capture-btn').addEventListener('click', () => {
      this.captureImage();
    });

    document.getElementById('cancel-camera-btn').addEventListener('click', () => {
      this.stopCamera();
    });

    document.getElementById('remove-image-btn').addEventListener('click', () => {
      this.removeImage();
    });

    // モーダル外クリックで閉じる
    document.getElementById('card-modal').addEventListener('click', (e) => {
      if (e.target.id === 'card-modal') {
        this.closeModal();
      }
    });
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  async loadCategories() {
    try {
      const response = await axios.get('/api/categories');
      if (response.data.success) {
        this.categories = response.data.data;
        this.updateCategoryFilter();
      }
    } catch (error) {
      console.error('カテゴリの取得に失敗しました:', error);
    }
  }

  updateCategoryFilter() {
    const select = document.getElementById('category-filter');
    select.innerHTML = '<option value="">全て</option>';
    
    this.categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.name;
      option.textContent = category.name;
      select.appendChild(option);
    });
  }

  async loadBusinessCards() {
    this.showLoading(true);
    
    try {
      const params = {
        limit: this.itemsPerPage,
        offset: (this.currentPage - 1) * this.itemsPerPage,
        ...this.currentFilters
      };

      const response = await axios.get('/api/business-cards', { params });
      
      if (response.data.success) {
        this.totalItems = response.data.total;
        this.renderBusinessCards(response.data.data);
        this.renderPagination();
        this.updateTotalCount();
      } else {
        this.showError('名刺データの取得に失敗しました');
      }
    } catch (error) {
      console.error('Error loading business cards:', error);
      this.showError('名刺データの取得中にエラーが発生しました');
    } finally {
      this.showLoading(false);
    }
  }

  renderBusinessCards(cards) {
    const container = document.getElementById('cards-container');
    
    if (!cards || cards.length === 0) {
      document.getElementById('no-results').classList.remove('hidden');
      container.innerHTML = '';
      return;
    }

    document.getElementById('no-results').classList.add('hidden');
    
    container.innerHTML = cards.map(card => `
      <div class="p-6 hover:bg-gray-50 cursor-pointer transition duration-200" onclick="businessCardManager.viewCard(${card.id})">
        <div class="flex items-start justify-between">
          ${card.image_url ? `
            <div class="flex-shrink-0 mr-4">
              <img src="${card.image_url}" alt="名刺画像" class="w-20 h-12 object-cover rounded border shadow-sm">
            </div>
          ` : ''}
          <div class="flex-1">
            <div class="flex items-center mb-2">
              <h3 class="text-lg font-semibold text-gray-800 mr-4">${this.escapeHtml(card.person_name)}</h3>
              ${card.categories && card.categories.length > 0 ? 
                card.categories.map(cat => `
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white mr-2" style="background-color: ${cat.color}">
                    ${this.escapeHtml(cat.name)}
                  </span>
                `).join('') : ''
              }
            </div>
            
            <div class="text-gray-600 space-y-1">
              <div class="flex items-center">
                <i class="fas fa-building w-4 mr-2"></i>
                <span class="font-medium">${this.escapeHtml(card.company_name)}</span>
                ${card.department ? `<span class="ml-2 text-gray-500">${this.escapeHtml(card.department)}</span>` : ''}
              </div>
              
              ${card.position ? `
                <div class="flex items-center">
                  <i class="fas fa-user-tie w-4 mr-2"></i>
                  <span>${this.escapeHtml(card.position)}</span>
                </div>
              ` : ''}
              
              ${card.email ? `
                <div class="flex items-center">
                  <i class="fas fa-envelope w-4 mr-2"></i>
                  <span>${this.escapeHtml(card.email)}</span>
                </div>
              ` : ''}
              
              ${card.phone ? `
                <div class="flex items-center">
                  <i class="fas fa-phone w-4 mr-2"></i>
                  <span>${this.escapeHtml(card.phone)}</span>
                </div>
              ` : ''}
            </div>
            
            ${card.notes ? `
              <div class="mt-3 text-sm text-gray-500 bg-gray-50 p-2 rounded">
                <i class="fas fa-sticky-note mr-2"></i>
                ${this.escapeHtml(card.notes.substring(0, 100))}${card.notes.length > 100 ? '...' : ''}
              </div>
            ` : ''}
          </div>
          
          <div class="text-sm text-gray-400 ml-4">
            <div>登録: ${new Date(card.created_at).toLocaleDateString('ja-JP')}</div>
            ${card.updated_at !== card.created_at ? 
              `<div>更新: ${new Date(card.updated_at).toLocaleDateString('ja-JP')}</div>` : ''
            }
          </div>
        </div>
      </div>
    `).join('');
  }

  renderPagination() {
    const container = document.getElementById('pagination');
    const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    
    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
        pages.push(i);
      } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
        pages.push('...');
      }
    }

    container.innerHTML = `
      <nav class="flex items-center space-x-1">
        <button 
          ${this.currentPage === 1 ? 'disabled' : ''} 
          class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          onclick="businessCardManager.changePage(${this.currentPage - 1})"
        >
          前へ
        </button>
        
        ${pages.map(page => {
          if (page === '...') {
            return '<span class="px-3 py-2 text-sm font-medium text-gray-700">...</span>';
          }
          return `
            <button 
              class="px-3 py-2 text-sm font-medium ${page === this.currentPage ? 
                'text-blue-600 bg-blue-50 border-blue-300' : 
                'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
              } border"
              onclick="businessCardManager.changePage(${page})"
            >
              ${page}
            </button>
          `;
        }).join('')}
        
        <button 
          ${this.currentPage === totalPages ? 'disabled' : ''} 
          class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          onclick="businessCardManager.changePage(${this.currentPage + 1})"
        >
          次へ
        </button>
      </nav>
    `;
  }

  updateTotalCount() {
    document.getElementById('total-count').textContent = `${this.totalItems}件`;
  }

  changePage(page) {
    if (page >= 1 && page <= Math.ceil(this.totalItems / this.itemsPerPage)) {
      this.currentPage = page;
      this.loadBusinessCards();
    }
  }

  applyFilters() {
    this.currentFilters = {};
    
    const searchTerm = document.getElementById('search-input').value.trim();
    if (searchTerm) {
      this.currentFilters.q = searchTerm;
    }
    
    const companyName = document.getElementById('company-filter').value.trim();
    if (companyName) {
      this.currentFilters.company_name = companyName;
    }
    
    const category = document.getElementById('category-filter').value;
    if (category) {
      this.currentFilters.category = category;
    }
    
    this.currentPage = 1;
    this.loadBusinessCards();
  }

  clearFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('company-filter').value = '';
    document.getElementById('category-filter').value = '';
    this.currentFilters = {};
    this.currentPage = 1;
    this.loadBusinessCards();
  }

  openModal(cardId = null) {
    this.currentEditingId = cardId;
    const modal = document.getElementById('card-modal');
    const title = document.getElementById('modal-title');
    const deleteBtn = document.getElementById('delete-btn');
    const form = document.getElementById('card-form');
    
    if (cardId) {
      title.textContent = '名刺編集';
      deleteBtn.classList.remove('hidden');
      this.loadCardForEdit(cardId);
    } else {
      title.textContent = '新規名刺登録';
      deleteBtn.classList.add('hidden');
      form.reset();
    }
    
    modal.classList.remove('hidden');
  }

  closeModal() {
    document.getElementById('card-modal').classList.add('hidden');
    document.getElementById('card-form').reset();
    this.stopCamera();
    this.hideImageUploadArea();
    this.currentEditingId = null;
    this.currentImageFilename = null;
  }

  async loadCardForEdit(cardId) {
    try {
      const response = await axios.get(`/api/business-cards/${cardId}`);
      if (response.data.success) {
        const card = response.data.data;
        const form = document.getElementById('card-form');
        
        // フォームにデータを設定
        Object.keys(card).forEach(key => {
          const input = form.querySelector(`[name="${key}"]`);
          if (input && card[key]) {
            input.value = card[key];
          }
        });

        // 既存画像を表示
        if (card.image_url && card.image_filename) {
          this.showCurrentImage(card.image_url, card.image_filename);
        } else {
          this.hideCurrentImage();
        }
      }
    } catch (error) {
      console.error('Error loading card for edit:', error);
      this.showError('名刺データの取得に失敗しました');
    }
  }

  async saveBusinessCard() {
    const form = document.getElementById('card-form');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // 空の値を削除
    Object.keys(data).forEach(key => {
      if (data[key] === '') {
        delete data[key];
      }
    });
    
    // 登録者情報を追加
    if (!this.currentEditingId) {
      data.registered_by = 'user'; // 実際のアプリでは認証情報から取得
    }

    try {
      let response;
      if (this.currentEditingId) {
        response = await axios.put(`/api/business-cards/${this.currentEditingId}`, data);
      } else {
        response = await axios.post('/api/business-cards', data);
      }
      
      if (response.data.success) {
        this.closeModal();
        this.loadBusinessCards();
        this.showSuccess(this.currentEditingId ? '名刺を更新しました' : '名刺を登録しました');
      } else {
        this.showError(response.data.error || '保存に失敗しました');
      }
    } catch (error) {
      console.error('Error saving business card:', error);
      this.showError('保存中にエラーが発生しました');
    }
  }

  async deleteBusinessCard() {
    if (!this.currentEditingId) return;
    
    if (!confirm('この名刺を削除しますか？この操作は取り消せません。')) {
      return;
    }

    try {
      const response = await axios.delete(`/api/business-cards/${this.currentEditingId}`);
      if (response.data.success) {
        this.closeModal();
        this.loadBusinessCards();
        this.showSuccess('名刺を削除しました');
      } else {
        this.showError('削除に失敗しました');
      }
    } catch (error) {
      console.error('Error deleting business card:', error);
      this.showError('削除中にエラーが発生しました');
    }
  }

  viewCard(cardId) {
    this.openModal(cardId);
  }

  showLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
      loading.classList.remove('hidden');
    } else {
      loading.classList.add('hidden');
    }
  }

  showError(message) {
    // 簡単なエラー表示（実際のアプリではより洗練されたUI）
    alert(`エラー: ${message}`);
  }

  showSuccess(message) {
    // 簡単な成功表示（実際のアプリではより洗練されたUI）
    alert(`成功: ${message}`);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 画像アップロード関連メソッド
  async handleFileUpload(file) {
    if (!file) return;

    // ファイル形式チェック
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.showError('対応していないファイル形式です（JPEG、PNG、WebPのみ対応）');
      return;
    }

    // ファイルサイズチェック（5MB）
    if (file.size > 5 * 1024 * 1024) {
      this.showError('ファイルサイズが大きすぎます（5MB以下にしてください）');
      return;
    }

    await this.uploadImage(file);
  }

  async uploadImage(file) {
    try {
      this.showUploadProgress(true);
      
      // 画像を最適化
      const optimizedFile = await this.optimizeImage(file);
      
      const formData = new FormData();
      formData.append('image', optimizedFile);
      if (this.currentEditingId) {
        formData.append('businessCardId', this.currentEditingId);
      }

      const response = await axios.post('/api/images/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          this.updateUploadProgress(percentCompleted);
        }
      });

      if (response.data.success) {
        this.showCurrentImage(response.data.image_url, response.data.image_filename);
        this.currentImageFilename = response.data.image_filename;
        this.showSuccess('画像をアップロードしました');
      } else {
        this.showError(response.data.error || 'アップロードに失敗しました');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      this.showError('画像のアップロード中にエラーが発生しました');
    } finally {
      this.showUploadProgress(false);
    }
  }

  async startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // 背面カメラを優先
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      this.cameraStream = stream;
      const video = document.getElementById('camera-video');
      video.srcObject = stream;
      video.play();
      
      document.getElementById('image-upload-area').classList.add('hidden');
      document.getElementById('camera-container').classList.remove('hidden');
      
    } catch (error) {
      console.error('Error accessing camera:', error);
      this.showError('カメラにアクセスできません。カメラの権限を許可してください。');
    }
  }

  stopCamera() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
    
    document.getElementById('camera-container').classList.add('hidden');
    document.getElementById('image-upload-area').classList.remove('hidden');
  }

  captureImage() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    canvas.toBlob(async (blob) => {
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      this.stopCamera();
      
      // 名刺スキャン用の画像処理を適用
      const enhancedFile = await this.enhanceBusinessCardImage(file);
      await this.uploadImage(enhancedFile);
    }, 'image/jpeg', 0.9);
  }

  async removeImage() {
    if (!this.currentImageFilename) return;
    
    if (!confirm('画像を削除しますか？')) return;

    try {
      const response = await axios.delete(`/api/images/${this.currentImageFilename}`);
      if (response.data.success) {
        this.hideCurrentImage();
        this.currentImageFilename = null;
        this.showSuccess('画像を削除しました');
      } else {
        this.showError('画像の削除に失敗しました');
      }
    } catch (error) {
      console.error('Error removing image:', error);
      this.showError('画像の削除中にエラーが発生しました');
    }
  }

  showCurrentImage(imageUrl, filename) {
    const container = document.getElementById('current-image-container');
    const img = document.getElementById('current-image');
    
    img.src = imageUrl;
    container.classList.remove('hidden');
    document.getElementById('image-upload-area').classList.add('hidden');
    this.currentImageFilename = filename;
  }

  hideCurrentImage() {
    document.getElementById('current-image-container').classList.add('hidden');
    document.getElementById('image-upload-area').classList.remove('hidden');
    this.currentImageFilename = null;
  }

  hideImageUploadArea() {
    document.getElementById('current-image-container').classList.add('hidden');
    document.getElementById('image-upload-area').classList.remove('hidden');
    document.getElementById('camera-container').classList.add('hidden');
    document.getElementById('upload-progress').classList.add('hidden');
  }

  showUploadProgress(show) {
    const progress = document.getElementById('upload-progress');
    if (show) {
      progress.classList.remove('hidden');
    } else {
      progress.classList.add('hidden');
      this.updateUploadProgress(0);
    }
  }

  updateUploadProgress(percent) {
    const progressBar = document.getElementById('progress-bar');
    progressBar.style.width = `${percent}%`;
  }

  // 画像最適化メソッド
  async optimizeImage(file, maxWidth = 1200, maxHeight = 800, quality = 0.8) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // アスペクト比を維持しながらリサイズ
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 高品質でリサイズ
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          const optimizedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(optimizedFile);
        }, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  // 名刺スキャン用の画像処理（コントラスト調整）
  async enhanceBusinessCardImage(file) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // 元の画像を描画
        ctx.drawImage(img, 0, 0);
        
        // 画像データを取得して処理
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // コントラストと明度を調整（名刺の文字を読みやすくする）
        const contrast = 1.2; // コントラスト調整
        const brightness = 10; // 明度調整
        
        for (let i = 0; i < data.length; i += 4) {
          // RGB値を取得
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];
          
          // コントラストと明度を調整
          r = Math.min(255, Math.max(0, contrast * (r - 128) + 128 + brightness));
          g = Math.min(255, Math.max(0, contrast * (g - 128) + 128 + brightness));
          b = Math.min(255, Math.max(0, contrast * (b - 128) + 128 + brightness));
          
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
        }
        
        // 処理した画像データを戻す
        ctx.putImageData(imageData, 0, 0);
        
        canvas.toBlob((blob) => {
          const enhancedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(enhancedFile);
        }, 'image/jpeg', 0.9);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }
}

// アプリケーション初期化
let businessCardManager;
document.addEventListener('DOMContentLoaded', () => {
  businessCardManager = new BusinessCardManager();
});