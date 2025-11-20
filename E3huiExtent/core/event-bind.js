// 全局核心数据（替代原export的globalData）
window.GlobalData = {
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
          // 验证数据完整性（原有逻辑）
          if (!window.GlobalData.screenshotBase64) {
            alert('请先完成截图再加入产品库！');
            return;
          }
          const validDetailImages = window.GlobalData.productImages.filter(url => url.startsWith('https://'));
          if (validDetailImages.length === 0) {
            alert('未获取到有效商品详情图片（需HTTPS协议），无法提交！');
            return;
          }
      
          // 新增：筛选勾选状态的详情图（核心修改）
          const productImagesContainer = document.querySelector('.product-images');
          const imageItems = productImagesContainer?.querySelectorAll('.image-list .image-item');
          if (!imageItems || imageItems.length === 0) {
            alert('未找到详情图片列表，无法识别勾选状态！');
            return;
          }
      
          // 遍历所有图片项，收集勾选的图片URL
          const checkedImageUrls = [];
          imageItems.forEach((item, index) => {
            const checkbox = item.querySelector('.image-checkbox');
            // 检查复选框是否有「checked」类（表示已勾选）
            if (checkbox && checkbox.classList.contains('checked')) {
              // 从全局数据中取对应索引的图片URL（确保与勾选项一致）
              const checkedUrl = validDetailImages[index];
              if (checkedUrl) {
                checkedImageUrls.push(checkedUrl);
                console.log(`勾选详情图${index+1}：`, checkedUrl);
              }
            }
          });
      
          // 校验：至少勾选1张详情图
          if (checkedImageUrls.length === 0) {
            alert('请至少勾选1张详情图后再提交！');
            return;
          }
      
          // 显示加载中，禁用按钮（原有逻辑）
          if (requestLoading && requestLoading.style) requestLoading.style.display = 'block';
          addToLibraryBtn.disabled = true;
      
          try {
            // 第一步：上传主图（不变）
            console.log('开始上传主图...');
            const mainImageUrl = await window.ApiRequest.uploadImageToServer(
              window.GlobalData.screenshotBase64,
              `main-image-${Date.now()}.png`, // 时间戳确保文件名唯一
              1
            );
            window.GlobalData.mainImageUrl = mainImageUrl;
            console.log('主图上传成功：', mainImageUrl);
      
            // 第二步：批量上传「勾选的详情图」（修改：仅上传 checkedImageUrls）
            console.log(`开始上传勾选的详情图（共${checkedImageUrls.length}张）...`);
            const detailImageUrls = [];
            const maxRetries = 1; // 每张图最多重试1次
            const uploadDelay = 500; // 每张图上传间隔500ms（避免限流）
      
            // 遍历「勾选的图片URL数组」（原逻辑是遍历 validDetailImages）
            for (const [index, imgUrl] of checkedImageUrls.entries()) {
              let detailUrl = null;
              let retryCount = 0;
      
              // 单张图片上传+重试逻辑（不变）
              while (retryCount <= maxRetries && !detailUrl) {
                try {
                  console.log(`上传勾选详情图${index+1}/${checkedImageUrls.length}（重试${retryCount}次）：`, imgUrl);
                  await window.Utils.delay(uploadDelay); // 间隔延迟
                  detailUrl = await window.ApiRequest.uploadImageToServer(
                    imgUrl,
                    `detail-image-${Date.now()}-${index+1}.png`, // 唯一文件名
                    2
                  );
                } catch (error) {
                  retryCount++;
                  console.warn(`勾选详情图${index+1}上传失败（重试${retryCount}/${maxRetries}）：`, error.message);
                  if (retryCount > maxRetries) {
                    console.error(`勾选详情图${index+1}最终上传失败：`, imgUrl);
                    // 不终止批量上传，仅提示跳过
                    alert(`警告：勾选详情图${index+1}上传失败（${error.message}），已跳过`);
                  }
                }
              }
      
              // 成功上传的图片URL加入数组（不变）
              if (detailUrl) {
                detailImageUrls.push(detailUrl);
                console.log(`勾选详情图${index+1}上传成功：`, detailUrl);
              }
            }
      
            // 校验：至少1张勾选详情图上传成功
            if (detailImageUrls.length === 0) {
              throw new Error('所有勾选的详情图上传失败，请检查图片URL有效性或网络连接');
            }
      
            // 第三步：提交到产品库（不变，参数名已对齐）
            const submitData = {
              Title: window.GlobalData.productTitle,
              Pic: mainImageUrl,
              ContentPics: detailImageUrls,
              address:window.GlobalData.address,
              productPrice:window.GlobalData.productPrice,
              LinkUrl: window.location.href // 之前新增的页面链接参数
            };
            await window.ApiRequest.submitToProductLibrary(submitData);
      
            // 提交成功提示（修改：显示勾选上传成功的数量）
            alert(`保存成功！已加入产品库\n主图：1张\n勾选详情图：${checkedImageUrls.length}张\n成功上传：${detailImageUrls.length}张\n页面链接：${submitData.LinkUrl}`);
          } catch (error) {
            console.error('加入产品库失败：', error);
            // 针对性错误提示（原有逻辑）
            let errorMsg = window.Utils.formatErrorMsg(error);
            if (errorMsg.includes('401') || errorMsg.includes('403')) {
              errorMsg += '\n\n请检查：1. 是否已登录 http://localhost:8010 2. 登录态是否过期';
            } else if (errorMsg.includes('跨域下载失败')) {
              errorMsg += '\n\n原因：图片服务器限制跨域下载，需后端提供代理接口';
            }
            alert(`保存失败：${errorMsg}`);
          } finally {
            // 隐藏加载中，恢复按钮状态（原有逻辑）
            if (requestLoading && requestLoading.style) requestLoading.style.display = 'none';
            addToLibraryBtn.disabled = false;
          }
        });
      }
    }
  };