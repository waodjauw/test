# CLAUDE.md

为本仓库中的 Claude Code 提供工作指引。

## 命令

```bash
npm run dev        # Vite 开发服务器 → http://localhost:5173/test/
npm run build      # 生产构建 → dist/
npm run preview    # 预览构建产物
npm run deploy     # 构建并发布 dist/ 到 GitHub Pages（gh-pages）
```

项目没有配置测试运行器、linter 或格式化工具。

Vite 的 `base` 为 `/test/`（与 GitHub Pages 仓库名一致）。除非同时修改部署目标，否则不要改动此值。

## 架构

TaskFlow Pro 是一个 Vue 3 + Pinia 的单页任务管理器。使用 **Vue Router（Hash 模式）** 管理视图 URL——路由映射到 `store.activeNav`（取值如 `all`、`today`、`week`、`overdue`、`done`、`p-<priority>`、`cat-<id>`），组件通过 `store.filteredTasks` 响应视图变化。状态持久化到 `localStorage`，键名为 `taskflow_data_v3`、`taskflow_settings`、`taskflow_pin`。

### 路由

定义在 `src/router/index.js`，7 条路由，使用 `createWebHashHistory`（兼容 GitHub Pages 静态部署）：

| URL | activeNav |
|---|---|
| `/` | `all` |
| `/today` | `today` |
| `/week` | `week` |
| `/overdue` | `overdue` |
| `/done` | `done` |
| `/priority/:priority` | `p-<priority>` |
| `/category/:id` | `cat-<id>` |

**数据流为单向**：路由变化 → `App.vue` 中的 `watch(route.path)` → `store.syncFromRoute(route)` 设置 `activeNav` → `filteredTasks` getter 重新计算。导航点击通过 `router.push()` 触发，不直接调用 `store.setActiveNav()`。

### 双布局：桌面端 vs 移动端

`App.vue` 根据 `useDevice().isMobile` 切换两套渲染树：

- **桌面端树**（≥1024px 和平板 768–1023px）：`TopNav` + `Sidebar` + `ContentArea`，包裹在 `.app-wrapper` 中（桌面端 1440px 宽，平板通过 `mobile.css` 全宽显示）。
- **移动端树**（<768px）：`src/components/mobile/MobileLayout.vue`，包含 `MobileTopNav`（汉堡菜单）、`MobileDrawer`（滑出侧栏）、`MobileStatsRow`（横向滚动）、`MobileToolbar` + `MobileFilterSheet`（底部弹出），以及 `MobileTaskGrid`（单列列表）。

模态框、`LockScreen`、`ContextMenu`、`ToastContainer` **始终挂载**在两套树之外，两端共用。`TaskCard` 也是共享的——内置 500ms `touchstart` 长按计时器，在触屏设备上触发 `ContextMenu`。

平板沿用桌面端树，但 `src/style/mobile.css` 通过 `@media (min-width: 768px) and (max-width: 1023px)` 调整：侧栏缩至 200px，任务网格 → 2 列，统计行 → 3 列，表单行堆叠。

### 断点

定义在 `src/composables/useDevice.js`（模块级单例，`matchMedia` 监听器）：
- 手机：`max-width: 767px`
- 平板：`768px–1023px`
- 桌面：`≥1024px`

### 状态管理（`src/stores/taskStore.js`）

单一 Pinia store。核心 getter：`filteredTasks`（依次应用 `activeNav` + `filters.{search,cat,cycle,priority}` + 按逾期/完成/优先级排序）、`stats`、`navBadges`、`categoryBadges`。日期工具函数（`isToday`、`isThisWeek`、`isOverdue`、`formatDeadline`、`getPriorityLabel`、`getPriorityTagClass`）从此文件导出——直接复用，不要重复编写。

`loadFromStorage()` 在 `App.vue` 的 `onMounted` 中调用；`scheduleReminders` 通过 `watch` 监听 tasks 和通知设置的变化来重新调度。

### 组合式函数

- `useDevice.js` — 单例响应式设备标志。在任意位置导入并调用 `useDevice()`。
- `useReminders.js` — `scheduleReminders(tasks, settings)` 清除并重建 `setTimeout` 链，用于窗口内提醒（上限 24h）。由 `task.reminder` 和 `task.deadline - settings.remindAhead` 驱动。
- `useToast.js` — `toastService.showToast(text, type)`。被提醒、store 变更等使用。
- `useCountdown.js` — 针对截止时间的响应式倒计时文本/样式类。
- `useDebouncedRef.js` — 通用防抖 ref 工厂，返回 `{ local, debounced }`。

### 样式

纯 CSS，无预处理器。在 `main.js` 中按以下顺序引入：`variables.css`（颜色令牌/阴影）→ `base.css`（重置 + `.app-wrapper`）→ `components.css`（所有桌面端组件样式，约 600 行）→ `mobile.css`（必须最后引入——包含平板覆写、移动端专属 `.m-*` 类，以及 `@media (hover: none)` 规则用于消除触屏上的桌面端 hover 状态）。

添加新视觉元素时，优先扩展 `components.css`，复用 `variables.css` 中的 `--accent`、`--bg-*`、`--text-*`、`--border-color`、`--shadow*`、`--radius`、`--transition`。

### 外部集成

图标使用 `lucide-vue-next`。所有表单元素、按钮、对话框、底部弹出均为原生 HTML + 自定义 CSS——不依赖任何 UI 组件库。Inter 字体通过 `index.html` 中的 Google Fonts 加载。

### 循环任务

当 `cycle !== 'none'` 的任务被标记完成时（通过 `toggleComplete` 或 `updateProgress(val=100)`），store 调用 `advanceDeadline(dl, cycle)` 将 `deadline` 和 `reminder` 向前推进一个周期（每日 +1d / 每周 +7d / 每月 +1mo，保留时分），`progress` 重置为 0，任务**不会**被标记为已完成。实现在 `src/stores/taskStore.js`。

### 搜索防抖

`Toolbar.vue` 和 `mobile/MobileToolbar.vue` 均使用 `src/composables/useDebouncedRef.js` 中的 `useDebouncedRef(initial, 250)` 来合并按键，延迟后调用 `store.setFilter('search', ...)`。
