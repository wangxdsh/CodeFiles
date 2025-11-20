// 显式将模板挂载到window全局对象，确保其他脚本可访问
window.widgetTemplate = `
  <div class="screenshot-widget">
    <!-- 窗口标题栏 -->
    <div class="widget-header">
      商品截图工具
      <button class="widget-close">×</button>
    </div>
    <!-- 窗口内容区 -->
    <div class="widget-content">
      <!-- 截图按钮 -->
      <button class="screenshot-btn">点击截取商品左侧信息区</button>
      <!-- 加入产品库按钮（默认隐藏） -->
      <button class="add-to-library-btn">加入产品库</button>
      <!-- 加载中提示 -->
      <div class="widget-loading">截图中...</div>
      <!-- 截图预览（默认隐藏） -->
      <div class="screenshot-preview" style="display: none;">
        <h4 class="list-title">截图预览</h4>
        <div class="image-item">
          <img class="image-thumbnail" src="" alt="截图预览">
        </div>
      </div>
      <!-- 商品详情图片列表（默认隐藏） -->
      <div class="product-images" style="display: none;">
        <h4 class="list-title">商品详情图片（共<span class="image-count">0</span>张）</h4>
        <div class="image-list"></div>
      </div>
    </div>
  </div>
  <!-- 接口请求loading（全局居中） -->
  <div class="library-loading">提交中...</div>
`;