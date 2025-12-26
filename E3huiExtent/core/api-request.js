// 接口请求工具（依赖window.Utils，挂载到window.ApiRequest）
window.ApiRequest = {
    /**
     * 上传图片到 File/UploadFile 接口（适配后端参数：fileModule + fileList）
     * @param {string} imageSource - 图片来源（Base64 或 URL）
     * @param {string} fileName - 上传文件名（建议带时间戳唯一标识）
     * @param {number} fileModule - 文件模块标识（1=主图，2=详情图）
     * @returns {string} 上传后的图片URL
     */
    async uploadImageToServer(imageSource, fileName, fileModule) {
      let blob;
  
      // 1. 处理图片来源（增加URL有效性校验+允许HTTP/HTTPS）
      if (imageSource.startsWith('data:image/')) {
        blob = window.Utils.dataURLToBlob(imageSource);
      } else {
        // 校验URL是否为HTTP或HTTPS（允许两种协议）
        if (!imageSource.startsWith('https://') && !imageSource.startsWith('http://')) {
          throw new Error(`图片URL无效：${imageSource}（必须是HTTP或HTTPS协议）`);
        }
  
        // 对于HTTP图片，先尝试转换为HTTPS（避免混合内容问题）
        let imageUrl = imageSource;
        let tryHttps = false;
        if (imageSource.startsWith('http://')) {
          imageUrl = imageSource.replace('http://', 'https://');
          tryHttps = true;
          console.log(`HTTP图片自动转换为HTTPS：${imageSource} -> ${imageUrl}`);
        }
  
        try {
          console.log('开始下载图片：', imageUrl);
          const response = await fetch(imageUrl, {
            mode: 'cors', // 允许跨域下载
            credentials: 'omit', // 图片下载无需携带Cookie
            headers: { 'Accept': 'image/*' }, // 明确接收图片类型
            redirect: 'follow' // 允许跟随重定向（适配图片服务器HTTPS重定向）
          });
  
          if (!response.ok) {
            throw new Error(`状态码${response.status}`);
          }
  
          // 校验下载的文件是否为图片
          const contentType = response.headers.get('Content-Type');
          if (!contentType || !contentType.startsWith('image/')) {
            throw new Error(`非图片类型（Content-Type：${contentType}）`);
          }
  
          blob = await response.blob();
          // 校验Blob大小（避免空文件）
          if (blob.size === 0) {
            throw new Error('文件为空');
          }
          console.log('图片下载成功，大小：', blob.size);
        } catch (error) {
          // 如果HTTPS转换失败，且原URL是HTTP，尝试使用原HTTP URL
          if (tryHttps && imageSource.startsWith('http://')) {
            console.warn(`HTTPS下载失败，尝试使用原HTTP URL：${imageSource}`);
            try {
              const response = await fetch(imageSource, {
                mode: 'cors',
                credentials: 'omit',
                headers: { 'Accept': 'image/*' },
                redirect: 'follow'
              });
  
              if (!response.ok) {
                throw new Error(`状态码${response.status}`);
              }
  
              const contentType = response.headers.get('Content-Type');
              if (!contentType || !contentType.startsWith('image/')) {
                throw new Error(`非图片类型（Content-Type：${contentType}）`);
              }
  
              blob = await response.blob();
              if (blob.size === 0) {
                throw new Error('文件为空');
              }
              console.log('HTTP图片下载成功，大小：', blob.size);
            } catch (httpError) {
              console.error('HTTP图片下载也失败：', httpError);
              // 如果HTTP也失败，抛出原始错误
              throw error;
            }
          } else {
            // 非HTTP转HTTPS的情况，直接抛出错误
            console.error('图片下载失败：', error);
            // 分类错误提示
            if (error.message.includes('Mixed Content') || error.message.includes('insecure resource')) {
              throw new Error(`混合内容拦截（HTTP图片被HTTPS页面阻止）- ${imageSource}`);
            } else if (error.name === 'TimeoutError') {
              throw new Error(`下载超时（超过10秒）- ${imageSource}`);
            } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
              throw new Error(`跨域下载失败（图片服务器CORS限制或网络错误）- ${imageSource}`);
            } else {
              throw new Error(`${error.message} - ${imageSource}`);
            }
          }
        }
      }
  
      // 2. 构造FormData（关键：每次创建新实例，避免缓存冲突）
      const formData = new FormData();
      formData.append('fileModule', fileModule); // 必填：文件模块标识（确保为number类型）
      formData.append('fileList', blob, fileName); // 必填：文件集合（参数名fileList）
  
      // 3. 发起上传请求（带超时控制、授权携带）
      try {
        const controller = new AbortController();
        const timeoutMs = 15000; // 上传超时延长到15秒（应对大图片）
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        // 核心修改1：拼接上传接口地址（确保 apiHost 正确拼接）
        const uploadUrl = `${window.GlobalData.apiHost}/file/uploadfile`; // 无多余斜杠
        console.log('上传接口地址：', uploadUrl); // 日志输出，确认地址正确

        console.log('发起上传请求：', {
          url: uploadUrl,
          fileModule,
          fileName,
          blobSize: blob.size,
          blobType: blob.type
        });
  
        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
          credentials: 'include', // 携带登录态（适配[AuthorizeFilter]）
          signal: controller.signal, // 绑定超时控制器
          headers: { 'Accept': 'application/json' ,'Referer': window.location.href} // 明确接收JSON
        });
  
        clearTimeout(timeoutId); // 清除超时定时器
  
        // 4. 处理响应状态（增强302/限流/服务器错误检测）
        if (response.status === 301 || response.status === 302 || response.status === 307) {
          const redirectUrl = response.headers.get('Location');
          console.error('接口重定向：', { status: response.status, redirectUrl });
          throw new Error(`接口重定向（${response.status}）- 可能未登录或接口路径错误`);
        }
  
        // 检测限流/服务器错误
        if (response.status === 429) {
          throw new Error('服务器限流，请稍后重试');
        }
        if (response.status >= 500) {
          throw new Error(`服务器内部错误（状态码${response.status}）`);
        }
  
        if (!response.ok) {
          throw new Error(`接口请求失败（状态码${response.status}：${response.statusText}）`);
        }
  
        // 处理授权失败
        if (response.status === 401 || response.status === 403) {
          throw new Error('401/403：未登录或登录态失效');
        }
  
        // 5. 解析响应数据（后端TData<string>格式）
        const result = await response.json();
        if (result.Tag === 1 && result.Data) {
          console.log('上传成功，返回URL：', result.Data);
          return result.Data;
        } else {
          throw new Error(`接口返回异常（Tag=${result.Tag}）：${result.Message || '无错误信息'}`);
        }
      } catch (error) {
        // 分类抛出错误
        if (error.name === 'AbortError') {
          throw new Error(`上传超时：超过${timeoutMs/1000}秒未响应`);
        } else if (error.message.includes('Failed to fetch')) {
          throw new Error('网络连接失败或接口不可用');
        } else {
          throw error;
        }
      }
    },
  
    /**
     * 提交数据到产品库接口（SaveFormWeb）
     * @param {Object} submitData - 提交数据（Title、MainImage、DetailImages）
     */
    async submitToProductLibrary(submitData) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 延长到15秒超时
  
        // 核心修改1：拼接上传接口地址（确保 apiHost 正确拼接）
        const submitUrl = `${window.GlobalData.apiHost}/AppManage/BaseProduct/SaveFormWeb`; // 无多余斜杠
        console.log('提交产品库数据：', submitData);

        const response = await fetch(submitUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json','Referer': window.location.href
          },
          body: JSON.stringify(submitData),
          credentials: 'include', // 携带登录态
          signal: controller.signal
        });
  
        clearTimeout(timeoutId);
  
        if (!response.ok) {
          throw new Error(`状态码${response.status}（${response.statusText}）`);
        }
  
        if (response.status === 401 || response.status === 403) {
          throw new Error('401/403：未登录或登录态失效');
        }
  
        const result = await response.json();
        if (result.Tag !== 1) {
          throw new Error(`接口返回异常（Tag=${result.Tag}）：${result.Message || '无错误信息'}`);
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          throw new Error('提交超时：超过15秒未响应');
        } else if (error.message.includes('Failed to fetch')) {
          throw new Error('网络连接失败或接口不可用');
        } else {
          throw error;
        }
      }
    }
  };