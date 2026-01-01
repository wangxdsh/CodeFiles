// 全局核心数据（替代原export的globalData）
window.GlobalData = {
    apiHost: 'https://51pinkongtest.com.cn', // 截图Base64
    apiImgUploadUrl: 'https://51pinkongtest.com.cn/File/uploadfile', // 截图Base64
    screenshotBase64: '', // 截图Base64
    productImages: [],    // 商品详情图片URL（待上传）
    productTitle: '',     // 商品标题
    productPrice: '',     // 价格
    address: '',     // 地址
    fabric: '',           // 面料数据
    productColors: [],    // 商品颜色和对应图片 [{color: string, imageUrl: string}]
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
  
      // 2. 绑定截图按钮事件（获取素材）
      if (screenshotBtn) {
        screenshotBtn.addEventListener('click', async () => {
          const productImagesContainer = document.querySelector('.product-images');
          const imagesLoading = productImagesContainer?.querySelector('.images-loading');
          const imageList = productImagesContainer?.querySelector('.image-list');

          // 禁用按钮
          screenshotBtn.disabled = true;
          if (addToLibraryBtn && addToLibraryBtn.style) addToLibraryBtn.style.display = 'none';

          // 显示商品详情图片模块和loading，隐藏图片列表
          if (productImagesContainer && productImagesContainer.style) {
            productImagesContainer.style.display = 'block';
          }
          if (imagesLoading && imagesLoading.style) {
            imagesLoading.style.display = 'flex';
          }
          if (imageList && imageList.style) {
            imageList.style.display = 'none'; // 加载完成前隐藏
          }

          // 重置商品图片数据
          window.GlobalData.productImages = [];

          try {
            // 加载所有懒加载图片 - 调用全局图片处理函数
            const productImages = await window.ImageHandle.loadAllLazyImages();
            window.GlobalData.productImages = productImages;

            // 隐藏loading，显示图片列表（移除display:none，恢复CSS默认的grid布局）
            if (imagesLoading && imagesLoading.style) {
              imagesLoading.style.display = 'none';
            }
            if (imageList && imageList.style) {
              imageList.style.display = ''; // 移除内联样式，恢复CSS默认的grid
            }

            // 更新UI - 调用全局图片处理函数
            window.ImageHandle.updateProductImagesUI(productImages);

            // 显示「加入产品库」按钮（至少有1张详情图才显示）
            if (addToLibraryBtn && addToLibraryBtn.style && productImages.length > 0) {
              addToLibraryBtn.style.display = 'block';
            } else if (addToLibraryBtn && addToLibraryBtn.style) {
              addToLibraryBtn.style.display = 'none';
              console.warn('未检测到有效商品详情图片');
            }
          } catch (error) {
            console.error('加载图片失败：', error);
            // 隐藏loading
            if (imagesLoading && imagesLoading.style) {
              imagesLoading.style.display = 'none';
            }
            alert(`操作失败：${window.Utils.formatErrorMsg(error)}`); // 调用全局工具函数
          } finally {
            // 恢复按钮状态
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
        
                // 第三步：上传颜色图片（如果有颜色数据）
                const colorImages = [];
                if (window.GlobalData.productColors && window.GlobalData.productColors.length > 0) {
                    console.log(`开始上传颜色图片（共${window.GlobalData.productColors.length}张）...`);
                    const maxRetries = 1;
                    const uploadDelay = 500;
        
                    for (const [index, colorItem] of window.GlobalData.productColors.entries()) {
                        let colorImageUrl = null;
                        let retryCount = 0;
        
                        while (retryCount <= maxRetries && !colorImageUrl) {
                            try {
                                console.log(`上传颜色图片${index+1}/${window.GlobalData.productColors.length}（颜色：${colorItem.color}，重试${retryCount}次）：`, colorItem.imageUrl);
                                await window.Utils.delay(uploadDelay);
                                colorImageUrl = await window.ApiRequest.uploadImageToServer(
                                    colorItem.imageUrl,
                                    `color-image-${Date.now()}-${index+1}.png`,
                                    2 // 使用详情图模块标识
                                );
                            } catch (error) {
                                retryCount++;
                                console.warn(`颜色图片${index+1}上传失败（重试${retryCount}/${maxRetries}）：`, error.message);
                                if (retryCount > maxRetries) {
                                    console.error(`颜色图片${index+1}最终上传失败：`, colorItem.imageUrl);
                                    alert(`警告：颜色图片"${colorItem.color}"上传失败（${error.message}），已跳过`);
                                }
                            }
                        }
        
                        if (colorImageUrl) {
                            colorImages.push({
                                color: colorItem.color,
                                imageUrl: colorImageUrl
                            });
                            console.log(`颜色图片${index+1}上传成功：`, colorImageUrl);
                        }
                    }
                }
        
                // 第四步：构建颜色规格数据（转换为后端ProductSpecParam格式）
                const colorSpec = {
                    Id: null, // 新增规格，ID为null
                    name: "颜色",
                    values: colorImages.map((colorItem, index) => ({
                        Id: null, // 新增规格值，ID为null
                        name: colorItem.color, // 颜色名称
                        image: colorItem.imageUrl, // 上传后的颜色图片URL
                        sort: index // 排序（按索引）
                    })),
                    sort: 0 // 规格排序
                };
        
                // 第五步：提交到产品库（包含颜色规格数据和面料数据）
                const submitData = {
                Title: window.GlobalData.productTitle,
                Pic: mainImageUrl,
                address:window.GlobalData.address,
                productPrice:window.GlobalData.productPrice,
                ContentPics: detailImageUrls,
                LinkUrl: window.location.href,
                ProductSpecs: colorImages.length > 0 ? [colorSpec] : [], // 颜色规格数组（转换为后端格式）
                Fabric: window.GlobalData.fabric || '' // 面料数据
                };
                await window.ApiRequest.submitToProductLibrary(submitData);
        
                // 成功提示（包含颜色信息）
                let successMsg = `保存成功！已加入产品库\n主图：1张\n勾选详情图：${checkedImageUrls.length}张\n成功上传：${detailImageUrls.length}张`;
                if (colorImages.length > 0) {
                    successMsg += `\n颜色图片：${colorImages.length}张`;
                }
                successMsg += `\n页面链接：${submitData.LinkUrl}`;
                alert(successMsg);
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