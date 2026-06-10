import { defineStore } from 'pinia'
import { toastService } from '../composables/useToast.js'

const STORAGE_KEY = 'taskflow_data_v3'
const PIN_KEY = 'taskflow_pin'
const SETTINGS_KEY = 'taskflow_settings'

function genId() { return 't' + Date.now() + Math.random().toString(36).slice(2, 6) }
function genCatId() { return 'c' + Date.now() + Math.random().toString(36).slice(2, 5) }

function isToday(dateStr) {
  if (!dateStr) return false
  const d = new Date(dateStr), t = new Date()
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
}
function isThisWeek(dateStr) {
  if (!dateStr) return false
  const d = new Date(dateStr), now = new Date()
  const start = new Date(now); start.setDate(now.getDate() - now.getDay())
  const end = new Date(start); end.setDate(start.getDate() + 6)
  start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999)
  return d >= start && d <= end
}
function isThisMonth(dateStr) {
  if (!dateStr) return false
  const d = new Date(dateStr), t = new Date()
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth()
}
function isOverdue(task) {
  if (!task.deadline || task.done) return false
  return new Date(task.deadline) < new Date()
}

export function formatDeadline(dl) {
  if (!dl) return ''
  const d = new Date(dl)
  return d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

function toLocalInputStr(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes())
}

export function advanceDeadline(dl, cycle) {
  if (!dl) return dl
  const d = new Date(dl)
  if (isNaN(d.getTime())) return dl
  if (cycle === 'daily') d.setDate(d.getDate() + 1)
  else if (cycle === 'weekly') d.setDate(d.getDate() + 7)
  else if (cycle === 'monthly') d.setMonth(d.getMonth() + 1)
  else return dl
  return toLocalInputStr(d)
}

export function getPriorityLabel(p) {
  return { critical: '🔴 紧急', high: '🟠 高', medium: '🟡 中', low: '🟢 低' }[p] || p
}
export function getPriorityTagClass(p) {
  return { critical: 'tag-priority-critical', high: 'tag-priority-high', medium: 'tag-priority-medium', low: 'tag-priority-low' }[p] || ''
}

export { isToday, isThisWeek, isThisMonth, isOverdue }

export const useTaskStore = defineStore('task', {
  state: () => ({
    tasks: [],
    categories: [
      { id: 'work', name: '工作', color: '#6366f1' },
      { id: 'study', name: '学习', color: '#0ea5e9' },
      { id: 'personal', name: '个人', color: '#ec4899' },
      { id: 'health', name: '健康', color: '#22c55e' },
      { id: 'finance', name: '财务', color: '#f59e0b' },
    ],
    settings: {
      theme: 'light',
      layout: 'grid',
      cardStyle: 'default',
      progressDisplay: 'both',
      pinEnabled: true,
      notifEnabled: true,
      overdueAlert: true,
      remindAhead: 30,
    },
    pin: '1234',
    selectedTasks: [],
    batchMode: false,
    filters: { search: '', cat: '', cycle: '', priority: '' },
    activeNav: 'all',
    isLocked: true,
    contextTaskId: null,
    contextMenuPos: { x: 0, y: 0 },
  }),

  getters: {
    filteredTasks(state) {
      let tasks = [...state.tasks]
      const nav = state.activeNav
      if (nav === 'today') tasks = tasks.filter(t => isToday(t.deadline))
      else if (nav === 'week') tasks = tasks.filter(t => isThisWeek(t.deadline))
      else if (nav === 'overdue') tasks = tasks.filter(t => isOverdue(t))
      else if (nav === 'done') tasks = tasks.filter(t => t.done)
      else if (nav.startsWith('p-')) tasks = tasks.filter(t => t.priority === nav.replace('p-', ''))
      else if (nav.startsWith('cat-')) tasks = tasks.filter(t => t.cat === nav.replace('cat-', ''))

      const { search, cat, cycle, priority } = state.filters
      if (search) {
        const q = search.toLowerCase()
        tasks = tasks.filter(t => t.title.toLowerCase().includes(q) || (t.desc || '').toLowerCase().includes(q))
      }
      if (cat) tasks = tasks.filter(t => t.cat === cat)
      if (priority) tasks = tasks.filter(t => t.priority === priority)
      if (cycle === 'today') tasks = tasks.filter(t => isToday(t.deadline))
      else if (cycle === 'week') tasks = tasks.filter(t => isThisWeek(t.deadline))
      else if (cycle === 'month') tasks = tasks.filter(t => isThisMonth(t.deadline))
      else if (cycle === 'overdue') tasks = tasks.filter(t => isOverdue(t))

      const po = { critical: 0, high: 1, medium: 2, low: 3 }
      tasks.sort((a, b) => {
        if (isOverdue(a) !== isOverdue(b)) return isOverdue(a) ? -1 : 1
        if (a.done !== b.done) return a.done ? 1 : -1
        return (po[a.priority] ?? 2) - (po[b.priority] ?? 2)
      })
      return tasks
    },

    stats(state) {
      const all = state.tasks
      const total = all.length
      const done = all.filter(t => t.done).length
      const inProgress = all.filter(t => !t.done && (t.progress || 0) > 0).length
      const overdue = all.filter(t => isOverdue(t)).length
      const rate = total ? Math.round(done / total * 100) : 0
      return {
        total, done, inProgress, overdue, rate,
        inProgressRatio: total ? inProgress / total * 100 : 0,
        doneRatio: total ? done / total * 100 : 0,
        overdueRatio: total ? overdue / total * 100 : 0,
      }
    },

    navBadges(state) {
      const all = state.tasks
      return {
        all: all.length,
        today: all.filter(t => isToday(t.deadline)).length,
        week: all.filter(t => isThisWeek(t.deadline)).length,
        overdue: all.filter(t => isOverdue(t)).length,
        done: all.filter(t => t.done).length,
        critical: all.filter(t => t.priority === 'critical').length,
        high: all.filter(t => t.priority === 'high').length,
        medium: all.filter(t => t.priority === 'medium').length,
        low: all.filter(t => t.priority === 'low').length,
      }
    },

    categoryBadges(state) {
      const result = {}
      state.categories.forEach(cat => {
        result[cat.id] = state.tasks.filter(t => t.cat === cat.id).length
      })
      return result
    },

    overallProgress(state) {
      const total = state.tasks.length
      const done = state.tasks.filter(t => t.done).length
      return total ? Math.round(done / total * 100) : 0
    },

    weeklyRate(state) {
      const weekTasks = state.tasks.filter(t => isThisWeek(t.deadline))
      const weekDone = weekTasks.filter(t => t.done).length
      return weekTasks.length ? Math.round(weekDone / weekTasks.length * 100) : 0
    },

    alertTasks(state) {
      const overdue = state.tasks.filter(t => isOverdue(t) && !t.done)
      const urgent = state.tasks.filter(t => {
        if (!t.deadline || t.done) return false
        const diff = new Date(t.deadline) - new Date()
        return diff > 0 && diff < 2 * 3600000
      })
      return { overdue, urgent }
    },

    hasAlerts(state) {
      return state.tasks.some(t => (isOverdue(t) && !t.done) || (!t.done && t.deadline && new Date(t.deadline) - new Date() < 2 * 3600000 && new Date(t.deadline) > new Date()))
    },

    contextTask(state) {
      return state.tasks.find(t => t.id === state.contextTaskId) || null
    },
  },

  actions: {
    loadFromStorage() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const saved = JSON.parse(raw)
          if (saved.tasks) this.tasks = saved.tasks
          if (saved.categories) this.categories = saved.categories
        }
        const pin = localStorage.getItem(PIN_KEY)
        if (pin) this.pin = pin
        const sraw = localStorage.getItem(SETTINGS_KEY)
        if (sraw) Object.assign(this.settings, JSON.parse(sraw))
      } catch (e) {
        toastService.showToast('数据加载失败：' + e.message, 'error')
      }

      if (!this.settings.pinEnabled) this.isLocked = false

      if (this.tasks.length === 0) this._seedDemoData()
    },

    _seedDemoData() {
      const now = new Date()
      const fmt = (d) => d.toISOString().slice(0, 16)
      const d = (n) => { const x = new Date(now); x.setDate(x.getDate() + n); return x }
      this.tasks = [
        { id: 't1', title: '完成Q4季度报告', desc: '整理数据并制作PPT演示文稿', cat: 'work', priority: 'critical', deadline: fmt(d(0)), reminder: fmt(d(0)), progress: 65, done: false, cycle: 'none', createdAt: now.toISOString() },
        { id: 't2', title: '阅读《深度工作》第三章', desc: '做读书笔记，提炼核心观点', cat: 'study', priority: 'medium', deadline: fmt(d(2)), reminder: fmt(d(1)), progress: 30, done: false, cycle: 'none', createdAt: now.toISOString() },
        { id: 't3', title: '每日晨跑 5km', desc: '保持健康习惯', cat: 'health', priority: 'low', deadline: fmt(d(0)), reminder: '', progress: 0, done: false, cycle: 'daily', createdAt: now.toISOString() },
        { id: 't4', title: '审核项目合同条款', desc: '重点核查第5、8、11条款', cat: 'finance', priority: 'high', deadline: fmt(d(-1)), reminder: '', progress: 80, done: false, cycle: 'none', createdAt: now.toISOString() },
        { id: 't5', title: '准备团队周会议程', desc: '收集各组进展，整理议题', cat: 'work', priority: 'high', deadline: fmt(d(1)), reminder: fmt(d(1)), progress: 40, done: false, cycle: 'weekly', createdAt: now.toISOString() },
        { id: 't6', title: '更新个人知识库', desc: '将本周学习内容归档至 Notion', cat: 'personal', priority: 'low', deadline: fmt(d(3)), reminder: '', progress: 10, done: true, cycle: 'none', createdAt: now.toISOString() },
        { id: 't7', title: '系统性能优化方案', desc: '分析慢查询，制定索引策略', cat: 'work', priority: 'medium', deadline: fmt(d(5)), reminder: '', progress: 0, done: false, cycle: 'none', createdAt: now.toISOString() },
        { id: 't8', title: '月度家庭预算规划', desc: '记录收支，制定下月预算', cat: 'finance', priority: 'medium', deadline: fmt(d(7)), reminder: '', progress: 50, done: false, cycle: 'monthly', createdAt: now.toISOString() },
      ]
      this._save()
    },

    _save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks: this.tasks, categories: this.categories }))
        localStorage.setItem(PIN_KEY, this.pin)
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings))
      } catch (e) {
        toastService.showToast('数据保存失败：' + e.message, 'error')
      }
    },

    isDuplicateTask(title, deadlineStr, excludeId) {
      const titleNorm = title.trim().toLowerCase()
      const date = deadlineStr ? new Date(deadlineStr).toDateString() : '__none__'
      return this.tasks.some(t => {
        if (t.id === excludeId) return false
        const tDate = t.deadline ? new Date(t.deadline).toDateString() : '__none__'
        return t.title.trim().toLowerCase() === titleNorm && tDate === date
      })
    },

    addTask(payload) {
      if (this.isDuplicateTask(payload.title, payload.deadline, null)) {
        toastService.showToast('任务重复！相同标题+日期已存在', 'error')
        return false
      }
      this.tasks.push({ id: genId(), ...payload, done: false, createdAt: new Date().toISOString() })
      this._save()
      toastService.showToast('任务已添加', 'success')
      return true
    },

    updateTask(id, payload) {
      if (this.isDuplicateTask(payload.title, payload.deadline, id)) {
        toastService.showToast('任务重复！相同标题+日期已存在', 'error')
        return false
      }
      const idx = this.tasks.findIndex(t => t.id === id)
      if (idx >= 0) Object.assign(this.tasks[idx], payload)
      this._save()
      toastService.showToast('任务已更新', 'success')
      return true
    },

    deleteTask(id) {
      this.tasks = this.tasks.filter(t => t.id !== id)
      this.selectedTasks = this.selectedTasks.filter(sid => sid !== id)
      this._save()
      toastService.showToast('任务已删除', 'info')
    },

    toggleComplete(id) {
      const t = this.tasks.find(x => x.id === id)
      if (!t) return
      if (!t.done && t.cycle && t.cycle !== 'none' && t.deadline) {
        t.deadline = advanceDeadline(t.deadline, t.cycle)
        if (t.reminder) t.reminder = advanceDeadline(t.reminder, t.cycle)
        t.progress = 0
        this._save()
        toastService.showToast('本轮完成 🎉 已推进到下一周期', 'success')
        return
      }
      t.done = !t.done
      if (t.done) t.progress = 100
      this._save()
      toastService.showToast(t.done ? '任务已完成 🎉' : '任务已重新开启', t.done ? 'success' : 'info')
    },

    updateProgress(id, val) {
      const t = this.tasks.find(x => x.id === id)
      if (!t) return
      if (val === 100 && t.cycle && t.cycle !== 'none' && t.deadline) {
        t.deadline = advanceDeadline(t.deadline, t.cycle)
        if (t.reminder) t.reminder = advanceDeadline(t.reminder, t.cycle)
        t.progress = 0
        this._save()
        toastService.showToast('本轮完成 🎉 已推进到下一周期', 'success')
        return
      }
      t.progress = val
      if (val === 100) t.done = true
      this._save()
      toastService.showToast('进度已更新为 ' + val + '%', 'success')
    },

    toggleBatchMode() {
      this.batchMode = !this.batchMode
      if (!this.batchMode) this.selectedTasks = []
    },

    toggleSelectTask(id) {
      const idx = this.selectedTasks.indexOf(id)
      if (idx >= 0) this.selectedTasks.splice(idx, 1)
      else this.selectedTasks.push(id)
    },

    batchSelectAll() {
      this.filteredTasks.forEach(t => {
        if (!this.selectedTasks.includes(t.id)) this.selectedTasks.push(t.id)
      })
    },

    batchMarkDone(done) {
      if (this.selectedTasks.length === 0) { toastService.showToast('请先选择任务', 'warn'); return }
      this.selectedTasks.forEach(id => {
        const t = this.tasks.find(x => x.id === id)
        if (t) { t.done = done; if (done) t.progress = 100 }
      })
      this._save()
      this.selectedTasks = []
      toastService.showToast(done ? '已批量标记完成' : '已批量标记未完成', 'success')
    },

    batchDelete() {
      if (this.selectedTasks.length === 0) { toastService.showToast('请先选择任务', 'warn'); return }
      const cnt = this.selectedTasks.length
      this.tasks = this.tasks.filter(t => !this.selectedTasks.includes(t.id))
      this.selectedTasks = []
      this._save()
      toastService.showToast('已删除 ' + cnt + ' 个任务', 'info')
    },

    addCategory(name, color) {
      if (!name.trim()) { toastService.showToast('请输入类别名称', 'error'); return false }
      if (this.categories.find(c => c.name.toLowerCase() === name.toLowerCase())) {
        toastService.showToast('类别名称已存在', 'error'); return false
      }
      this.categories.push({ id: genCatId(), name: name.trim(), color })
      this._save()
      toastService.showToast('类别「' + name + '」已添加', 'success')
      return true
    },

    deleteCategory(id) {
      if (this.tasks.some(t => t.cat === id)) {
        toastService.showToast('该类别下还有任务，无法删除', 'error'); return
      }
      this.categories = this.categories.filter(c => c.id !== id)
      this._save()
      toastService.showToast('类别已删除', 'info')
    },

    setActiveNav(nav) {
      this.activeNav = nav
    },

    syncFromRoute(route) {
      const p = route.path
      if (p === '/') this.activeNav = 'all'
      else if (p === '/today') this.activeNav = 'today'
      else if (p === '/week') this.activeNav = 'week'
      else if (p === '/overdue') this.activeNav = 'overdue'
      else if (p === '/done') this.activeNav = 'done'
      else if (p.startsWith('/priority/')) this.activeNav = 'p-' + route.params.priority
      else if (p.startsWith('/category/')) this.activeNav = 'cat-' + route.params.id
      else this.activeNav = 'all'
    },

    applyTheme(theme) {
      this.settings.theme = theme
      document.documentElement.removeAttribute('data-theme')
      if (theme !== 'light') document.documentElement.setAttribute('data-theme', theme)
      this._save()
    },

    setLayout(layout) {
      this.settings.layout = layout
      this._save()
    },

    setCardStyle(style) {
      this.settings.cardStyle = style
      this._save()
    },

    setProgressDisplay(mode) {
      this.settings.progressDisplay = mode
      this._save()
    },

    toggleSetting(key) {
      this.settings[key] = !this.settings[key]
      this._save()
    },

    setRemindAhead(min) {
      this.settings.remindAhead = parseInt(min)
      this._save()
    },

    verifyPin(inputPin) {
      if (inputPin === this.pin) {
        this.isLocked = false
        toastService.showToast('解锁成功，欢迎回来！', 'success')
        return true
      }
      return false
    },

    lockApp() {
      this.isLocked = true
    },

    changePin(oldPin, newPin, confirmPin) {
      if (oldPin !== this.pin) return { ok: false, msg: '当前 PIN 码错误' }
      if (newPin.length !== 4) return { ok: false, msg: 'PIN 码必须为 4 位' }
      if (newPin !== confirmPin) return { ok: false, msg: '两次输入不一致' }
      this.pin = newPin
      this._save()
      toastService.showToast('PIN 码已修改', 'success')
      return { ok: true }
    },

    setFilter(key, val) {
      this.filters[key] = val
    },

    openContextMenu(taskId, x, y) {
      this.contextTaskId = taskId
      this.contextMenuPos = { x, y }
    },

    closeContextMenu() {
      this.contextTaskId = null
    },

    notifyBell() {
      const overdue = this.tasks.filter(t => isOverdue(t) && !t.done)
      if (overdue.length) toastService.showToast('有 ' + overdue.length + ' 个任务已逾期！', 'warn')
      else toastService.showToast('暂无待处理提醒', 'info')
    },
  },
})
