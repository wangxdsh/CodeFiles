// 全局工具函数对象（挂载到window，供其他脚本调用）
window.Utils = {
    /**
     * 延迟函数（用于滚动加载、等待图片加载）
     * @param {number} ms - 延迟毫秒数
     * @returns {Promise}
     */
    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },
  
    /**
     * Base64 转 Blob（适配图片上传）
     * @param {string} dataURL - Base64格式图片数据
     * @returns {Blob} Blob对象
     */
    dataURLToBlob(dataURL) {
      const arr = dataURL.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    },
  
    /**
     * 提取商品标题（从 span.ft-bold.art-num-text 元素）
     * @returns {string} 商品标题（默认"未命名商品"）
     */
    extractProductTitle() {
      const titleElement = document.querySelector('span.ft-bold.art-num-text');
      return titleElement ? titleElement.textContent.trim() : '未命名商品';
    },
    extractProductPrice() {
        const priceElement = document.querySelector('span.price-content');
        return priceElement ? priceElement.textContent.trim() : '未采集到价格';
      },
      extractAddress() {
        const addressElement = document.querySelector('span.merchant-info-addr');
        return addressElement ? addressElement.textContent.trim() : '未采集到地址';
      },
    /**
     * 统一错误提示（分类显示，帮助排查）
     * @param {Error} error - 错误对象
     * @returns {string} 格式化后的错误信息
     */
    formatErrorMsg(error) {
      let errorMsg = error.message || '操作失败';
      if (errorMsg.includes('Failed to fetch')) {
        errorMsg = '网络请求失败！可能原因：1. 本地服务未启动 2. 接口跨域未配置 3. 登录态失效';
      } else if (errorMsg.includes('401') || errorMsg.includes('403')) {
        errorMsg = '权限不足！请先登录 http://localhost:8010 系统再操作';
      } else if (error.name === 'AbortError') {
        errorMsg = '请求超时：超过15秒未响应';
      } else if (errorMsg.includes('混合内容拦截')) {
        errorMsg = '图片混合内容拦截：HTTP图片被HTTPS页面阻止（已自动转为HTTPS，可能图片服务器不支持）';
      } else if (errorMsg.includes('跨域下载失败')) {
        errorMsg = '图片跨域下载失败：图片服务器限制访问（需后端提供代理接口）';
      }
      return errorMsg;
    }
  };