// 图片处理工具（依赖window.Utils，挂载到window.ImageHandle）
window.ImageHandle = {
    /**
     * 截取目标DIV（.product-info-left）
     * @returns {string} 截图Base64数据
     */
    async captureTargetDiv() {
      const targetDiv = document.querySelector('.product-info-left');
      if (!targetDiv) throw new Error('未找到商品信息区域，无法截图！');
  
      // 使用html2canvas渲染截图（高清配置）
      const canvas = await html2canvas(targetDiv, {
        scale: 2, // 2倍高清，避免截图模糊
        useCORS: true, // 允许跨域图片加载
        allowTaint: false, // 禁止Canvas污染
        logging: false, // 关闭控制台日志
        letterRendering: true, // 优化字体渲染
        scrollY: -window.scrollY, // 解决滚动后截图偏移
        scrollX: -window.scrollX
      });
  
      // 转为PNG格式Base64数据返回
      return canvas.toDataURL('image/png');
    },
  
    /**
     * 加载所有懒加载图片（滚动触发+去重过滤+HTTPS协议替换+预检测）
     * @returns {Array} 商品详情图片URL数组（最多10张）
     */
    async loadAllLazyImages() {
      const contentDiv = document.querySelector('.product-details-content');
      if (!contentDiv) return [];
  
      // 记录初始滚动位置（后续恢复，不影响用户浏览）
      const initialScrollTop = window.scrollY;
      const initialScrollLeft = window.scrollX;
      const contentHeight = contentDiv.offsetHeight;
      const scrollStep = 500; // 每次滚动步长
      const scrollDelay = 300; // 滚动后等待时间（给懒加载留时间）
  
      try {
        // 分步滚动，触发懒加载图片加载
        for (let scrollTop = 0; scrollTop <= contentHeight; scrollTop += scrollStep) {
          contentDiv.scrollTop = scrollTop;
          window.scrollTo(initialScrollLeft, initialScrollTop + scrollTop);
          await window.Utils.delay(scrollDelay); // 调用全局工具函数
        }
  
        // 最后滚动到contentDiv底部，确保最后一批图片加载
        contentDiv.scrollTop = contentHeight;
        window.scrollTo(initialScrollLeft, initialScrollTop + contentHeight);
        await window.Utils.delay(500); // 延长等待，确保图片完全加载
  
        // 提取并过滤有效图片
        const imgElements = contentDiv.querySelectorAll('img');
        const images = [];
  
        imgElements.forEach(img => {
          let imgUrl = img.src.trim() || (img.dataset.src && img.dataset.src.trim());
          if (!imgUrl) return;
  
          // 核心修复1：补全省略协议的URL（//xxx → https://xxx）
          if (imgUrl.startsWith('//')) {
            imgUrl = 'https:' + imgUrl;
            console.log('补全省略协议的图片URL：', imgUrl);
          }
          // 核心修复2：HTTP协议转为HTTPS（解决混合内容问题）
          else if (imgUrl.startsWith('http://')) {
            imgUrl = imgUrl.replace('http://', 'https://');
            console.log('替换HTTP图片URL为HTTPS：', imgUrl);
          }
  
          // 过滤非HTTPS协议的无效URL
          if (!imgUrl.startsWith('https://')) {
            console.warn('过滤无效图片URL（非HTTPS）：', imgUrl);
            return;
          }
  
          // 过滤小图标（宽高<50px 大概率是功能图标，非商品图）
          if (img.width >= 50 && img.height >= 50) {
            // 去除URL参数（避免同图不同参数导致的重复）
            imgUrl = imgUrl.split('?')[0];
            images.push(imgUrl);
          }
        });
  
        // 新增：预检测图片URL有效性（HEAD请求快速验证，不下载完整图片）
        const validImages = [];
        for (const imgUrl of [...new Set(images)]) {
          try {
            const testResponse = await fetch(imgUrl, {
              method: 'HEAD', // 仅请求头，不下载内容
              mode: 'cors',
              timeout: 3000 // 3秒超时，快速检测
            });
            if (testResponse.ok) {
              validImages.push(imgUrl);
              console.log('图片URL有效：', imgUrl);
            } else {
              console.warn(`图片URL无效（状态码：${testResponse.status}）：`, imgUrl);
            }
          } catch (error) {
            console.warn(`图片URL检测失败：${imgUrl}，原因：${error.message}`);
          }
        }
  
        // 去重后取前10张有效图片返回validImages.slice(0, 10);
        return validImages;
      } finally {
        // 恢复用户初始滚动位置
        window.scrollTo(initialScrollLeft, initialScrollTop);
        contentDiv.scrollTop = 0;
      }
    },
  
    /**
     * 更新商品信息UI（标题、价格、地址、面料）
     */
    updateProductInfoUI() {
      const titleElement = document.querySelector('.product-title');
      const priceElement = document.querySelector('.product-price');
      const addressElement = document.querySelector('.product-address');
      const fabricElement = document.querySelector('.product-fabric');
      
      // 更新商品标题
      if (titleElement && window.GlobalData.productTitle) {
        titleElement.textContent = window.GlobalData.productTitle || '-';
      }
      
      // 更新商品价格
      if (priceElement && window.GlobalData.productPrice) {
        priceElement.textContent = window.GlobalData.productPrice || '-';
      }
      
      // 更新商户地址
      if (addressElement && window.GlobalData.address) {
        addressElement.textContent = window.GlobalData.address || '-';
      }
      
      // 更新面料信息
      if (fabricElement && window.GlobalData.fabric) {
        fabricElement.textContent = window.GlobalData.fabric || '-';
      }
    },

    /**
     * 更新截图预览UI
     * @param {string} screenshotBase64 - 截图Base64数据
     */
    updatePreviewUI(screenshotBase64) {
      const previewContainer = document.querySelector('.screenshot-preview');
      const previewImg = previewContainer?.querySelector('.image-thumbnail');
      
      // 校验元素是否存在，避免null错误
      if (!previewContainer || !previewImg) return;
  
      // 渲染截图预览
      previewImg.src = screenshotBase64;
      previewContainer.style.display = 'block';
  
      // 绑定复选框事件（点击复选框或图片均可切换选中状态）
      const checkbox = previewContainer.querySelector('.image-checkbox');
      const imageItem = previewContainer.querySelector('.image-item');
      
      if (checkbox && imageItem) {
        // 点击复选框（阻止事件冒泡，避免触发图片点击）
        checkbox.addEventListener('click', (e) => {
          e.stopPropagation();
          checkbox.classList.toggle('checked');
        });
  
        // 点击图片触发复选框切换
        imageItem.addEventListener('click', () => {
          checkbox.classList.toggle('checked');
        });
      }
    },
  
    /**
     * 更新商品颜色列表UI
     * @param {Array} colors - 商品颜色数组 [{color: string, imageUrl: string}]
     */
    updateProductColorsUI(colors) {
      const productColorsContainer = document.querySelector('.product-colors');
      const colorList = productColorsContainer?.querySelector('.color-list');
      const colorCount = productColorsContainer?.querySelector('.color-count');
      
      if (!productColorsContainer || !colorList || !colorCount) return;

      // 如果没有颜色数据，隐藏容器
      if (!colors || colors.length === 0) {
        productColorsContainer.style.display = 'none';
        return;
      }

      colorCount.textContent = colors.length;
      productColorsContainer.style.display = 'block';
      colorList.innerHTML = ''; // 清空原有内容

      // 循环渲染颜色项
      colors.forEach((colorItem, index) => {
        const colorElement = document.createElement('div');
        colorElement.className = 'color-item';
        colorElement.innerHTML = `
          <div class="color-thumbnail-wrapper">
            <img class="color-thumbnail" src="${colorItem.imageUrl}" alt="${colorItem.color}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\'%3E%3Crect fill=\'%23ddd\' width=\'100\' height=\'100\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-size=\'12\'%3E加载失败%3C/text%3E%3C/svg%3E'">
          </div>
          <span class="color-name">${colorItem.color}</span>
        `;

        colorList.appendChild(colorElement);
      });
    },

    /**
     * 更新商品图片列表UI
     * @param {Array} images - 商品详情图片URL数组
     */
    updateProductImagesUI(images) {
      const productImagesContainer = document.querySelector('.product-images');
      const imageList = productImagesContainer?.querySelector('.image-list');
      const imageCount = productImagesContainer?.querySelector('.image-count');
      
      if (!productImagesContainer || !imageList || !imageCount || images.length === 0) return;

      imageCount.textContent = images.length;
      productImagesContainer.style.display = 'block';
      imageList.innerHTML = ''; // 清空原有内容

      // 循环渲染图片项（核心修改：给复选框添加 data-img-url 属性）
      images.forEach((imgUrl, index) => {
        const imageItem = document.createElement('div');
        imageItem.className = 'image-item';
        // 给图片项也添加 data-url（双重保险）
        imageItem.dataset.url = imgUrl;
        imageItem.innerHTML = `
          <!-- 核心修改：给复选框添加 data-img-url 存储图片URL -->
          <div class="image-checkbox" data-img-url="${imgUrl}"></div>
          <img class="image-thumbnail" src="${imgUrl}" alt="商品图片${index+1}">
        `;

        // 绑定复选框事件（原有逻辑不变，确保能正常勾选）
        const checkbox = imageItem.querySelector('.image-checkbox');
        if (checkbox) {
          // 点击复选框（阻止冒泡）
          checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            checkbox.classList.toggle('checked');
          });

          // 点击图片触发复选框切换
          imageItem.addEventListener('click', () => {
            checkbox.classList.toggle('checked');
          });
        }

        imageList.appendChild(imageItem);
      });
    }
  };