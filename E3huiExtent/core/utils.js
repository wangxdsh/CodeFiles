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
     * 提取商品面料数据（从 .content-box-fabric .cont 元素）
     * @returns {string} 面料数据（默认"未采集到面料"）
     */
    extractFabric() {
      const fabricElement = document.querySelector('.content-box-fabric .cont');
      return fabricElement ? fabricElement.textContent.trim() : '未采集到面料';
    },
    /**
     * 提取商品颜色和对应的图片（从 li.sku-warp-li 元素）
     * - 允许图片链接以 http 或 https 开头
     * @returns {Array<{color: string, imageUrl: string}>} 颜色和图片数组
     */
    extractProductColors() {
      const colorItems = document.querySelectorAll('li.sku-warp-li');
      const colors = [];
      
      colorItems.forEach((item) => {
        // 获取颜色名称（优先使用 data-color 属性，否则使用 span 文本）
        const colorName = item.dataset.color?.trim() || 
                         item.querySelector('span')?.textContent?.trim() || 
                         '未知颜色';
        
        // 获取图片 URL（优先使用 src，否则使用 data-src）
        const imgElement = item.querySelector('img');
        if (!imgElement) return;

        const rawUrl = imgElement.src?.trim() || imgElement.dataset.src?.trim() || '';
        if (!rawUrl) return;

        // 仅接受 http / https 开头的链接，其余丢弃
        if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
          console.warn('过滤无效颜色图片URL（非http/https）：', rawUrl);
          return;
        }

        colors.push({
          color: colorName,
          imageUrl: rawUrl
        });
      });
      
      return colors;
    },
    /**
     * 获取认证Token（从localStorage、sessionStorage或cookie中获取）
     * @returns {string|null} Token字符串，如果不存在则返回null
     */
    /**
     * 获取认证Token（从localStorage、sessionStorage、cookie或通过background script获取）
     * @returns {Promise<string|null>} Token字符串，如果不存在则返回null
     */
    async getAuthToken() {
      // 优先从localStorage获取（优先UserToken，因为接口要求此字段名）
      let token = localStorage.getItem('UserToken') ||
                  localStorage.getItem('token') || 
                  localStorage.getItem('access_token') || 
                  localStorage.getItem('Authorization') ||
                  localStorage.getItem('authToken');
      
      if (token) {
        const tokenPreview = token.length > 20 
          ? `${token.substring(0, 10)}...${token.substring(token.length - 10)}` 
          : token;
        console.log('从localStorage获取到token：', tokenPreview, `(长度: ${token.length})`);
        console.log('完整UserToken：', token);
        return token;
      }
      
      // 如果localStorage中没有，尝试从sessionStorage获取
      token = sessionStorage.getItem('UserToken') ||
              sessionStorage.getItem('token') || 
              sessionStorage.getItem('access_token') || 
              sessionStorage.getItem('Authorization') ||
              sessionStorage.getItem('authToken');
      
      if (token) {
        const tokenPreview = token.length > 20 
          ? `${token.substring(0, 10)}...${token.substring(token.length - 10)}` 
          : token;
        console.log('从sessionStorage获取到token：', tokenPreview, `(长度: ${token.length})`);
        console.log('完整UserToken：', token);
        return token;
      }
      
      // 如果还没有，尝试从当前页面的cookie中获取
      const cookies = document.cookie.split(';');
      console.log('检查当前页面cookie中的token，所有cookie：', document.cookie);
      
      // 先检查常见的token字段名
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        const cookieName = name.trim();
        const cookieValue = value ? decodeURIComponent(value.trim()) : '';
        
        if (cookieName === 'UserToken' || 
            cookieName === 'token' || 
            cookieName === 'access_token' || 
            cookieName === 'Authorization' || 
            cookieName === 'authToken' ||
            cookieName.toLowerCase().includes('token') ||
            cookieName.toLowerCase().includes('auth')) {
          if (cookieValue) {
            const tokenPreview = cookieValue.length > 20 
              ? `${cookieValue.substring(0, 10)}...${cookieValue.substring(cookieValue.length - 10)}` 
              : cookieValue;
            console.log(`从当前页面cookie获取到token，字段名：${cookieName}，值：`, tokenPreview, `(长度: ${cookieValue.length})`);
            console.log('完整UserToken：', cookieValue);
            return cookieValue;
          }
        }
      }
      
      // 如果当前页面没找到，尝试通过background script从51pinkongtest.com.cn获取
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'getToken',
          domain: '51pinkongtest.com.cn'
        });
        
        if (response && response.token) {
          const tokenPreview = response.token.length > 20 
            ? `${response.token.substring(0, 10)}...${response.token.substring(response.token.length - 10)}` 
            : response.token;
          console.log('通过background script从51pinkongtest.com.cn获取到token：', tokenPreview, `(长度: ${response.token.length})`);
          console.log('完整UserToken：', response.token);
          return response.token;
        }
      } catch (error) {
        console.warn('通过background script获取token失败：', error);
      }
      
      console.warn('未找到token，请检查是否已在 https://51pinkongtest.com.cn/admin/ 登录');
      return null;
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