// 全局核心数据（替代原export的globalData）
window.GlobalData = {
    apiHost: 'https://www.ehkang.com/e3hui', // 截图Base64
    screenshotBase64: '', // 截图Base64
    productImages: [],    // 商品详情图片URL（待上传）
    productTitle: '',     // 商品标题
    productPrice: '',     // 价格
    address: '',     // 地址
    mainImageUrl: '',     // 上传后的主图URL
    detailImageUrls: []   // 上传后的详情图URL数组
  };
  
  // 事件绑定工具（依赖全局ImageHandle、ApiRequest、Utils）
  window.EventBind = {
    /**
     * 绑定所有事件（窗口关闭、截图按钮、加入产品库按钮）
     */
    bindAllEvents() {
      // 获取所有DOM元素（从父容器查找，避免null错误）
      const widget = document.querySelector('.screenshot-widget');
      if (!widget) throw new Error('未找到悬浮窗口容器，事件绑定失败');
  
      const closeBtn = widget.querySelector('.widget-close');
      const screenshotBtn = widget.querySelector('.screenshot-btn');
      const addToLibraryBtn = widget.querySelector('.add-to-library-btn');
      const widgetLoading = widget.querySelector('.widget-loading');
      const requestLoading = document.querySelector('.library-loading');
  
      // 1. 绑定窗口关闭事件
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          if (widget.style) widget.style.display = 'none';
        });
      }
  
      // 2. 绑定截图按钮事件
      if (screenshotBtn) {
        screenshotBtn.addEventListener('click', async () => {
          // 显示加载中，禁用按钮
          if (widgetLoading && widgetLoading.style) widgetLoading.style.display = 'block';
          screenshotBtn.disabled = true;
          if (addToLibraryBtn && addToLibraryBtn.style) addToLibraryBtn.style.display = 'none';
  
          // 重置全局数据
          Object.assign(window.GlobalData, {
            screenshotBase64: '',
            productImages: [],
            mainImageUrl: '',
            detailImageUrls: []
          });
  
          try {
            // 截图目标DIV - 调用全局图片处理函数
            const screenshotBase64 = await window.ImageHandle.captureTargetDiv();
            window.GlobalData.screenshotBase64 = screenshotBase64;
  
            // 加载所有懒加载图片 - 调用全局图片处理函数
            const productImages = await window.ImageHandle.loadAllLazyImages();
            window.GlobalData.productImages = productImages;
  
            // 更新UI - 调用全局图片处理函数
            window.ImageHandle.updatePreviewUI(screenshotBase64);
            window.ImageHandle.updateProductImagesUI(productImages);
  
            // 显示「加入产品库」按钮（至少有1张详情图才显示）
            if (addToLibraryBtn && addToLibraryBtn.style && productImages.length > 0) {
              addToLibraryBtn.style.display = 'block';
            } else if (addToLibraryBtn && addToLibraryBtn.style) {
              addToLibraryBtn.style.display = 'none';
              alert('未检测到有效商品详情图片，无法加入产品库');
            }
          } catch (error) {
            console.error('截图/加载图片失败：', error);
            alert(`操作失败：${window.Utils.formatErrorMsg(error)}`); // 调用全局工具函数
          } finally {
            // 隐藏加载中，恢复按钮状态
            if (widgetLoading && widgetLoading.style) widgetLoading.style.display = 'none';
            screenshotBtn.disabled = false;
          }
        });
      }
  
      // 3. 绑定「加入产品库」按钮事件
        if (addToLibraryBtn) {
            addToLibraryBtn.addEventListener('click', async () => {
            // 获取悬浮窗口内的 Loading 元素（原有逻辑）
            const submitLoading = document.querySelector('.submit-loading');
            if (!submitLoading) {
                alert('未找到提交 Loading 元素，无法继续！');
                return;
            }
        
            // 验证数据完整性（原有逻辑）
            if (!window.GlobalData.screenshotBase64) {
                alert('请先完成截图再加入产品库！');
                return;
            }
        
            // 核心修复：筛选勾选的详情图（直接从复选框取URL，不依赖索引）
            const checkedCheckboxes = document.querySelectorAll('.product-images .image-checkbox.checked');
            if (!checkedCheckboxes || checkedCheckboxes.length === 0) {
                alert('请至少勾选1张详情图后再提交！');
                return;
            }
        
            // 收集勾选的图片URL（从复选框的 data-img-url 属性获取）
            const checkedImageUrls = [];
            checkedCheckboxes.forEach((checkbox, index) => {
                const imgUrl = checkbox.dataset.imgUrl?.trim();
                if (imgUrl && imgUrl.startsWith('https://')) {
                checkedImageUrls.push(imgUrl);
                console.log(`勾选详情图${index+1}：`, imgUrl);
                }
            });
        
            // 二次校验：确保收集到有效URL（避免空值或非HTTPS URL）
            if (checkedImageUrls.length === 0) {
                alert('勾选的图片URL无效，请重新勾选！');
                return;
            }
        
            // 显示 Loading，隐藏按钮（原有逻辑）
            addToLibraryBtn.style.display = 'none';
            submitLoading.style.display = 'inline-flex';
        
            try {
                // 第一步：上传主图（不变）
                console.log('开始上传主图...');
                const mainImageUrl = await window.ApiRequest.uploadImageToServer(
                window.GlobalData.screenshotBase64,
                `main-image-${Date.now()}.png`,
                1
                );
                window.GlobalData.mainImageUrl = mainImageUrl;
                console.log('主图上传成功：', mainImageUrl);
        
                // 第二步：批量上传「勾选的详情图」（使用 checkedImageUrls，不变）
                console.log(`开始上传勾选的详情图（共${checkedImageUrls.length}张）...`);
                const detailImageUrls = [];
                const maxRetries = 1;
                const uploadDelay = 500;
        
                for (const [index, imgUrl] of checkedImageUrls.entries()) {
                let detailUrl = null;
                let retryCount = 0;
        
                while (retryCount <= maxRetries && !detailUrl) {
                    try {
                    console.log(`上传勾选详情图${index+1}/${checkedImageUrls.length}（重试${retryCount}次）：`, imgUrl);
                    await window.Utils.delay(uploadDelay);
                    detailUrl = await window.ApiRequest.uploadImageToServer(
                        imgUrl,
                        `detail-image-${Date.now()}-${index+1}.png`,
                        2
                    );
                    } catch (error) {
                    retryCount++;
                    console.warn(`勾选详情图${index+1}上传失败（重试${retryCount}/${maxRetries}）：`, error.message);
                    if (retryCount > maxRetries) {
                        console.error(`勾选详情图${index+1}最终上传失败：`, imgUrl);
                        alert(`警告：勾选详情图${index+1}上传失败（${error.message}），已跳过`);
                    }
                    }
                }
        
                if (detailUrl) {
                    detailImageUrls.push(detailUrl);
                    console.log(`勾选详情图${index+1}上传成功：`, detailUrl);
                }
                }
        
                if (detailImageUrls.length === 0) {
                throw new Error('所有勾选的详情图上传失败，请检查图片URL有效性或网络连接');
                }
        
                // 第三步：提交到产品库（不变）
                const submitData = {
                Title: window.GlobalData.productTitle,
                Pic: mainImageUrl,
                address:window.GlobalData.address,
                productPrice:window.GlobalData.productPrice,
                ContentPics: detailImageUrls,
                LinkUrl: window.location.href
                };
                await window.ApiRequest.submitToProductLibrary(submitData);
        
                // 成功提示（不变）
                alert(`保存成功！已加入产品库\n主图：1张\n勾选详情图：${checkedImageUrls.length}张\n成功上传：${detailImageUrls.length}张\n页面链接：${submitData.LinkUrl}`);
            } catch (error) {
                // 错误处理（不变）
                console.error('加入产品库失败：', error);
                let errorMsg = window.Utils.formatErrorMsg(error);
                if (errorMsg.includes('401') || errorMsg.includes('403')) {
                errorMsg += '\n\n请检查：1. 是否已登录 http://localhost:8010 2. 登录态是否过期';
                } else if (errorMsg.includes('跨域下载失败')) {
                errorMsg += '\n\n原因：图片服务器限制跨域下载，需后端提供代理接口';
                }
                alert(`保存失败：${errorMsg}`);
            } finally {
                // 隐藏 Loading，恢复按钮（不变）
                submitLoading.style.display = 'none';
                addToLibraryBtn.style.display = 'block';
                addToLibraryBtn.disabled = false;
            }
            });
        }
    }
  };