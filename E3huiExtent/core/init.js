/**
 * 渲染悬浮窗口到页面（从window.widgetTemplate读取模板，增加重试）
 */
function renderFloatingWidget() {
    // 验证模板是否存在（显式检查window.widgetTemplate）
    if (!window.widgetTemplate || typeof window.widgetTemplate !== 'string') {
      throw new Error('未找到悬浮窗口模板！可能原因：1. template.js未加载 2. 模板变量未挂载到window');
    }
  
    // 渲染悬浮窗口（确保添加到body末尾，避免被其他元素覆盖）
    const div = document.createElement('div');
    div.innerHTML = window.widgetTemplate;
    // 先清空可能存在的旧窗口（避免重复渲染）
    const oldWidget = document.querySelector('.screenshot-widget');
    if (oldWidget) oldWidget.remove();
    // 添加新窗口到body
    document.body.appendChild(div.firstElementChild);
  }
  
  /**
   * 安全初始化（增加模板加载重试，最多3次，每次间隔100ms）
   */
  async function safeInit() {
    const maxRetry = 3;
    let retryCount = 0;
  
    while (retryCount < maxRetry) {
      try {
        // 尝试渲染窗口
        renderFloatingWidget();
        console.log('悬浮窗口模板加载成功');
        break; // 成功则退出循环
      } catch (error) {
        retryCount++;
        console.warn(`模板加载失败（${retryCount}/${maxRetry}）：`, error.message);
        if (retryCount >= maxRetry) {
          throw error; // 重试次数用尽，抛出最终错误
        }
        await window.Utils.delay(100); // 重试前延迟100ms
      }
    }
  
    // 提取商品标题（存入全局数据）
    window.GlobalData.productTitle = window.Utils.extractProductTitle();
    console.log('提取商品标题：', window.GlobalData.productTitle);
    
    // 提取商品价格（存入全局数据）
    window.GlobalData.productPrice = window.Utils.extractProductPrice();
    console.log('提取商品价格：', window.GlobalData.productPrice);
    
    // 提取商户地址（存入全局数据）
    window.GlobalData.address = window.Utils.extractAddress();
    console.log('提取商户地址：', window.GlobalData.address);
    
    // 提取面料数据（存入全局数据）
    window.GlobalData.fabric = window.Utils.extractFabric();
    console.log('提取面料数据：', window.GlobalData.fabric);
    
    // 更新商品信息UI（延迟确保DOM已渲染）
    await window.Utils.delay(100);
    window.ImageHandle.updateProductInfoUI();
    console.log('商品信息UI更新完成');
    
    // 提取商品颜色和对应图片（存入全局数据）
    window.GlobalData.productColors = window.Utils.extractProductColors();
    console.log('提取商品颜色：', window.GlobalData.productColors);
    
    // 更新颜色列表UI（延迟确保DOM已渲染）
    await window.Utils.delay(100);
    if (window.GlobalData.productColors && window.GlobalData.productColors.length > 0) {
      window.ImageHandle.updateProductColorsUI(window.GlobalData.productColors);
      console.log('颜色列表UI更新完成');
    }

    // 延迟100ms绑定事件（确保DOM完全渲染）
    await window.Utils.delay(100);
    window.EventBind.bindAllEvents();
    console.log('插件初始化完成，事件绑定成功');

    // 延迟500ms后自动执行截图（确保页面完全加载）
    await window.Utils.delay(500);
    try {
      console.log('开始自动截图...');
      const autoLoading = document.querySelector('.auto-screenshot-loading');
      if (autoLoading && autoLoading.style) {
        autoLoading.style.display = 'flex';
      }
      const targetDiv = document.querySelector('.product-info-left');
      if (targetDiv) {
        const screenshotBase64 = await window.ImageHandle.captureTargetDiv();
        window.GlobalData.screenshotBase64 = screenshotBase64;
        window.ImageHandle.updatePreviewUI(screenshotBase64);
        console.log('自动截图完成并已显示');
      } else {
        console.warn('未找到商品信息区域，无法自动截图');
      }
    } catch (error) {
      console.warn('自动截图失败：', error.message);
    } finally {
      const autoLoading = document.querySelector('.auto-screenshot-loading');
      if (autoLoading && autoLoading.style) {
        autoLoading.style.display = 'none';
      }
    }
  }
  
  /**
   * 插件初始化入口（页面加载完成后执行）
   */
  window.addEventListener('load', async () => {
    try {
      // 等待页面完全加载（额外延迟200ms，确保所有脚本都已执行）
      await window.Utils.delay(200);
      await safeInit();
    } catch (error) {
      console.error('插件初始化失败：', error);
      alert(`插件初始化失败：${error.message}\n请检查：1. template.js是否在manifest中配置 2. 脚本加载顺序是否正确`);
    }
  });