// 全局存储关键数据（截图、图片列表、标题、上传后的URL）
let globalData = {
    screenshotBase64: '', // 截图Base64（待上传）
    productImages: [],    // 商品详情图片URL（待上传）
    productTitle: '',     // 商品标题
    mainImageUrl: '',     // 上传后的主图URL
    detailImageUrls: []   // 上传后的详情图URL数组
  };
  
  // 页面加载完成后初始化悬浮窗口
  window.addEventListener('load', () => {
    try {
      // 1. 渲染悬浮窗口（确保模板先渲染完成）
      renderFloatingWidget();
  
      // 2. 等待DOM渲染完成（延迟100ms，避免渲染延迟导致元素找不到）
      setTimeout(() => {
        // 3. 绑定所有事件（确保元素已存在）
        bindAllEvents();
  
        // 4. 初始化提取商品标题
        extractProductTitle();
      }, 100);
    } catch (error) {
      console.error('初始化失败：', error);
      alert('插件初始化失败，请刷新页面重试！');
    }
  });
  
  /**
   * 渲染悬浮窗口到页面（确保DOM结构完整）
   */
  function renderFloatingWidget() {
    const div = document.createElement('div');
    div.innerHTML = widgetTemplate;
    document.body.appendChild(div.firstElementChild);
    
    // 确保loading元素也被渲染
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'library-loading';
    loadingDiv.textContent = '提交中...';
    document.body.appendChild(loadingDiv);
  }
  
  /**
   * 统一绑定所有事件（先获取父容器，再查找子元素，避免null错误）
   */
  function bindAllEvents() {
    // 获取核心父容器（先判断是否存在）
    const widget = document.querySelector('.screenshot-widget');
    if (!widget) throw new Error('未找到悬浮窗口容器');
  
    // 从父容器查找子元素（比全局查找更可靠）
    const closeBtn = widget.querySelector('.widget-close');
    const screenshotBtn = widget.querySelector('.screenshot-btn');
    const addToLibraryBtn = widget.querySelector('.add-to-library-btn');
    const loading = widget.querySelector('.widget-loading');
    const previewContainer = widget.querySelector('.screenshot-preview');
    const previewImg = previewContainer ? previewContainer.querySelector('.image-thumbnail') : null;
    const productImagesContainer = widget.querySelector('.product-images');
    const imageList = productImagesContainer ? productImagesContainer.querySelector('.image-list') : null;
    const imageCount = productImagesContainer ? productImagesContainer.querySelector('.image-count') : null;
    const requestLoading = document.querySelector('.library-loading');
  
    // 绑定窗口关闭事件
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (widget.style) widget.style.display = 'none';
      });
    }
  
    // 绑定截图按钮事件
    if (screenshotBtn) {
      screenshotBtn.addEventListener('click', async () => {
        // 操作元素前先判断是否存在
        if (loading && loading.style) loading.style.display = 'block';
        if (screenshotBtn) screenshotBtn.disabled = true;
        if (addToLibraryBtn && addToLibraryBtn.style) addToLibraryBtn.style.display = 'none';
        if (previewContainer && previewContainer.style) previewContainer.style.display = 'none';
        if (productImagesContainer && productImagesContainer.style) productImagesContainer.style.display = 'none';
  
        // 重置全局数据（避免上次残留）
        globalData = {
          ...globalData,
          mainImageUrl: '',
          detailImageUrls: []
        };
  
        try {
          // 1. 截取目标DIV（先判断元素是否存在）
          const targetDiv = document.querySelector('.product-info-left');
          if (!targetDiv) {
            alert('未找到商品信息区域，无法截图！');
            return;
          }
  
          const canvas = await html2canvas(targetDiv, {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            logging: false,
            letterRendering: true,
            scrollY: -window.scrollY,
            scrollX: -window.scrollX
          });
          const screenshotData = canvas.toDataURL('image/png');
          globalData.screenshotBase64 = screenshotData;
  
          // 2. 加载所有懒加载图片
          const productImages = await loadAllLazyImages();
          globalData.productImages = productImages;
  
          // 3. 更新UI（所有DOM操作前先判断元素是否存在）
          if (previewContainer && previewImg) {
            updatePreviewUI(previewContainer, previewImg);
          }
          if (productImagesContainer && imageList && imageCount) {
            updateProductImagesUI(productImagesContainer, imageList, imageCount, productImages);
          }
  
          // 4. 显示「加入产品库」按钮
          if (addToLibraryBtn && addToLibraryBtn.style) {
            addToLibraryBtn.style.display = 'block';
          }
  
        } catch (error) {
          console.error('截图/加载图片失败：', error);
          alert('操作失败，请刷新页面重试！');
        } finally {
          if (loading && loading.style) loading.style.display = 'none';
          if (screenshotBtn) screenshotBtn.disabled = false;
        }
      });
    }
  
    // 绑定「加入产品库」按钮事件
    if (addToLibraryBtn) {
      addToLibraryBtn.addEventListener('click', async () => {
        // 1. 验证数据完整性
        if (!globalData.screenshotBase64) {
          alert('请先完成截图再加入产品库！');
          return;
        }
  
        if (globalData.productImages.length === 0) {
          alert('未获取到商品详情图片，无法提交！');
          return;
        }
  
        // 2. 显示加载提示（先判断元素是否存在）
        if (requestLoading && requestLoading.style) requestLoading.style.display = 'block';
        if (addToLibraryBtn) addToLibraryBtn.disabled = true;
  
        try {
          // 3. 第一步：上传主图（截图）获取URL - 传入fileModule=1（主图模块，可修改）
          console.log('开始上传主图...');
          const mainImageUrl = await uploadImageToServer(globalData.screenshotBase64, 'main-image.png', 1);
          if (!mainImageUrl) {
            throw new Error('主图上传失败');
          }
          globalData.mainImageUrl = mainImageUrl;
          console.log('主图上传成功：', mainImageUrl);
  
          // 4. 第二步：批量上传详情图获取URL（最多10张）- 传入fileModule=2（详情图模块，可修改）
          console.log('开始上传详情图...');
          const detailImageUrls = [];
          for (const [index, imgUrl] of globalData.productImages.entries()) {
            // 限制最多上传10张
            if (index >= 10) break;
  
            const detailUrl = await uploadImageToServer(imgUrl, `detail-image-${index+1}.png`, 2);
            if (detailUrl) {
              detailImageUrls.push(detailUrl);
            }
          }
  
          if (detailImageUrls.length === 0) {
            throw new Error('详情图上传失败，请重试');
          }
          globalData.detailImageUrls = detailImageUrls;
          console.log('详情图上传成功：', detailImageUrls);
  
          // 5. 第三步：提交数据到产品库接口
          await submitToProductLibrary();
  
        } catch (error) {
          console.error('加入产品库失败：', error);
          alert(`保存失败：${error.message || '网络错误或接口不可用'}`);
        } finally {
          if (requestLoading && requestLoading.style) requestLoading.style.display = 'none';
          if (addToLibraryBtn) addToLibraryBtn.disabled = false;
        }
      });
    }
  }
  
  /**
   * 提取商品标题（span.ft-bold.art-num-text）
   */
  function extractProductTitle() {
    const titleElement = document.querySelector('span.ft-bold.art-num-text');
    globalData.productTitle = titleElement ? titleElement.textContent.trim() : '未命名商品';
    console.log('提取的商品标题：', globalData.productTitle);
  }
  
  /**
   * 加载所有懒加载图片（原逻辑不变，增加元素判断）
   */
  async function loadAllLazyImages() {
    const contentDiv = document.querySelector('.product-details-content');
    if (!contentDiv) return [];
  
    const initialScrollTop = window.scrollY;
    const initialScrollLeft = window.scrollX;
    const contentHeight = contentDiv.offsetHeight;
    const scrollStep = 500;
    const scrollDelay = 300;
  
    try {
      for (let scrollTop = 0; scrollTop <= contentHeight; scrollTop += scrollStep) {
        contentDiv.scrollTop = scrollTop;
        window.scrollTo(initialScrollLeft, initialScrollTop + scrollTop);
        await delay(scrollDelay);
      }
  
      contentDiv.scrollTop = contentHeight;
      window.scrollTo(initialScrollLeft, initialScrollTop + contentHeight);
      await delay(500);
  
      const imgElements = contentDiv.querySelectorAll('img');
      const images = [];
  
      imgElements.forEach(img => {
        let imgUrl = img.src.trim() || (img.dataset.src && img.dataset.src.trim());
        if (!imgUrl) return;
  
        if (img.width >= 50 && img.height >= 50) {
          imgUrl = imgUrl.split('?')[0];
          images.push(imgUrl);
        }
      });
  
      return [...new Set(images)].slice(0, 10); // 提前限制最多10张，减少上传压力
    } finally {
      window.scrollTo(initialScrollLeft, initialScrollTop);
      contentDiv.scrollTop = 0;
    }
  }
  
  /**
   * 延迟函数（原逻辑不变）
   */
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * 更新截图预览UI（接收元素参数，避免全局查找）
   */
  function updatePreviewUI(previewContainer, previewImg) {
    if (!previewContainer || !previewImg) return;
  
    previewImg.src = globalData.screenshotBase64;
    if (previewContainer.style) previewContainer.style.display = 'block';
  
    const checkbox = previewContainer.querySelector('.image-checkbox');
    if (checkbox) {
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        checkbox.classList.toggle('checked');
      });
  
      const imageItem = previewContainer.querySelector('.image-item');
      if (imageItem) {
        imageItem.addEventListener('click', () => {
          checkbox.classList.toggle('checked');
        });
      }
    }
  }
  
  /**
   * 更新商品图片列表UI（接收元素参数，避免全局查找）
   */
  function updateProductImagesUI(productImagesContainer, imageList, imageCount, images) {
    if (!productImagesContainer || !imageList || !imageCount || images.length === 0) return;
  
    imageCount.textContent = images.length;
    if (productImagesContainer.style) productImagesContainer.style.display = 'block';
    imageList.innerHTML = '';
  
    images.forEach((imgUrl, index) => {
      const imageItem = document.createElement('div');
      imageItem.className = 'image-item';
      imageItem.innerHTML = `
        <div class="image-checkbox"></div>
        <img class="image-thumbnail" src="${imgUrl}" alt="商品图片${index+1}">
      `;
  
      const checkbox = imageItem.querySelector('.image-checkbox');
      if (checkbox) {
        checkbox.addEventListener('click', (e) => {
          e.stopPropagation();
          checkbox.classList.toggle('checked');
        });
  
        imageItem.addEventListener('click', () => {
          checkbox.classList.toggle('checked');
        });
      }
  
      imageList.appendChild(imageItem);
    });
  }
  
  /**
   * 核心工具函数：上传图片到 File/UploadFile 接口（适配新接口参数）
   * @param {string} imageSource - 图片来源（Base64 或 图片URL）
   * @param {string} fileName - 上传的文件名
   * @param {number} fileModule - 文件模块标识（必填，如1=主图、2=详情图）
   * @returns {string} 接口返回的图片URL
   */
  async function uploadImageToServer(imageSource, fileName, fileModule) {
    let blob;
  
    // 区分图片来源：Base64 或 普通URL
    if (imageSource.startsWith('data:image/')) {
      // 处理Base64格式（主图）
      blob = dataURLToBlob(imageSource);
    } else {
      // 处理普通图片URL（详情图）：先下载图片转为Blob
      try {
        const response = await fetch(imageSource, {
          mode: 'cors', // 跨域请求
          credentials: 'omit' // 不携带Cookie
        });
  
        if (!response.ok) {
          throw new Error(`图片下载失败：${imageSource}`);
        }
  
        blob = await response.blob();
      } catch (error) {
        console.error('图片下载失败：', error);
        throw new Error('详情图下载失败（可能存在跨域限制）');
      }
    }
  
    // 构造FormData（适配接口参数：fileModule + fileList）
    const formData = new FormData();
    formData.append('fileModule', fileModule); // 新增fileModule字段（必填）
    formData.append('fileList', blob, fileName); // 文件参数名改为fileList（与接口一致）
  
    // 发起上传请求
    const response = await fetch('http://localhost:8010/File/UploadFile', {
      method: 'POST',
      body: formData,
      credentials: 'include' // 必须携带登录态（接口有[AuthorizeFilter]授权）
    });
  
    // 处理授权失败（401/403）
    if (response.status === 401 || response.status === 403) {
      throw new Error('上传失败：未登录或登录态失效，请先登录系统');
    }
  
    const result = await response.json();
  
    // 接口返回格式：TData<string>，包含Tag、Data、Message
    if (result.Tag === 1 && result.Data) {
      return result.Data; // 返回图片URL
    } else {
      throw new Error(`上传失败：${result.Message || '接口返回异常'}`);
    }
  }
  
  /**
   * 核心函数：提交数据到产品库接口（SaveFormWeb）
   */
  async function submitToProductLibrary() {
    const submitData = {
      Title: globalData.productTitle,
      MainImage: globalData.mainImageUrl, // 上传后的主图URL
      DetailImages: globalData.detailImageUrls // 上传后的详情图URL数组
    };
  
    console.log('提交到产品库的数据：', submitData);
  
    const response = await fetch('http://localhost:8010/AppManage/BaseProduct/SaveFormWeb', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(submitData),
      credentials: 'include' // 携带登录态（接口可能有授权）
    });
  
    // 处理授权失败
    if (response.status === 401 || response.status === 403) {
      throw new Error('提交失败：未登录或登录态失效，请先登录系统');
    }
  
    const result = await response.json();
  
    if (result.Tag === 1) {
      alert('保存成功！已加入产品库');
    } else {
      throw new Error(result.Message || '产品库接口返回异常');
    }
  }
  
  /**
   * Base64 转 Blob（工具函数，原逻辑不变）
   */
  function dataURLToBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }