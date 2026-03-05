# P40 Spec - 创新扩散 S 曲线调节滑块

## 1. Summary

- **Project ID**: P40
- **Project Name**: 创新扩散 S 曲线调节滑块
- **Goal**: 罗杰斯 S 曲线可视化，实时调节 K/r/t₀ 参数，辅助传播理论教学
- **User Persona**: 新传学生 / 培训讲师

## 2. Scope

- **In scope**:
  - 罗杰斯 S 曲线可视化
  - 实时调节 K/r/t₀ 参数
  - 辅助传播理论教学
- **Out of scope**:
  - 后端代理或服务端逻辑
  - API Key 持久化存储

## 3. UX

- **Core workflow**: 用户输入 → 前端处理 → 结果展示
- **Inputs**: 参数滑块 (K, r, t₀)
- **Outputs**: 实时 S 曲线图
- **States**: empty (初始) / loading (处理中) / error (失败) / success (完成)

## 4. Functional Requirements

1. FR-1: 罗杰斯 S 曲线可视化
2. FR-2: 结果可视化展示
3. FR-3: 错误状态可见提示

## 5. Non-Functional Requirements

- **Performance**: 核心任务 3 分钟内完成
- **Accessibility**: 键盘导航、aria-label、焦点可见、WCAG AA 对比度
- **Privacy**: 本地处理优先，不默认上传数据
- **Browser support**: 现代 Chromium (Chrome 110+)

## 6. Dependencies

- **Libraries/CDNs**: Chart.js (CDN)
- **Local data**: 无

## 7. Risks & Mitigations

- **Risk**: 参数超界导致曲线异常
- **Mitigation**: 限制参数范围

## 8. Acceptance Criteria

- [ ] 参数滑块
- [ ] S 曲线绘制
- [ ] 实时更新
- [ ] 纯静态页面可部署 GitHub Pages
- [ ] 移动端可用
- [ ] 隐私提示清晰可见
