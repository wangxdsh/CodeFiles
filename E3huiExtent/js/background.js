// Background Service Worker - 用于跨域获取cookie和token

/**
 * 从指定域名获取token（通过chrome.cookies API）
 * @param {string} domain - 域名（如 '51pinkongtest.com.cn'）
 * @returns {Promise<string|null>} Token字符串或null
 */
async function getTokenFromDomain(domain) {
  try {
    // 尝试从cookie中获取token（多种可能的字段名）
    const tokenFieldNames = ['UserToken', 'token', 'access_token', 'Authorization', 'authToken'];
    
    for (const fieldName of tokenFieldNames) {
      try {
        const cookie = await chrome.cookies.get({
          url: `https://${domain}/`,
          name: fieldName
        });
        
        if (cookie && cookie.value) {
          const tokenPreview = cookie.value.length > 20 
            ? `${cookie.value.substring(0, 10)}...${cookie.value.substring(cookie.value.length - 10)}` 
            : cookie.value;
          console.log(`从${domain}的cookie获取到token，字段名：${fieldName}，值：`, tokenPreview, `(长度: ${cookie.value.length})`);
          console.log(`完整UserToken：`, cookie.value);
          return cookie.value;
        }
      } catch (error) {
        // 继续尝试下一个字段名
        continue;
      }
    }
    
    // 如果直接字段名没找到，尝试查找所有包含token关键词的cookie
    try {
      const cookies = await chrome.cookies.getAll({ domain: domain });
      for (const cookie of cookies) {
        const name = cookie.name.toLowerCase();
        if ((name.includes('token') || name.includes('auth') || name.includes('session')) && 
            cookie.value && cookie.value.length > 10) {
          const tokenPreview = cookie.value.length > 20 
            ? `${cookie.value.substring(0, 10)}...${cookie.value.substring(cookie.value.length - 10)}` 
            : cookie.value;
          console.log(`从${domain}的cookie获取到可能的token，字段名：${cookie.name}，值：`, tokenPreview, `(长度: ${cookie.value.length})`);
          console.log(`完整UserToken：`, cookie.value);
          return cookie.value;
        }
      }
    } catch (error) {
      console.error('获取cookie失败：', error);
    }
    
    return null;
  } catch (error) {
    console.error('获取token失败：', error);
    return null;
  }
}

/**
 * 处理来自content script的消息
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getToken') {
    const domain = request.domain || '51pinkongtest.com.cn';
    getTokenFromDomain(domain).then(token => {
      sendResponse({ token: token });
    }).catch(error => {
      console.error('获取token错误：', error);
      sendResponse({ token: null });
    });
    return true; // 保持消息通道开放以支持异步响应
  }
});

