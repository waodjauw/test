<template>
  <Teleport to="body">
    <Transition name="m-drawer">
      <div v-if="modelValue" class="m-drawer-root" @click.self="close">
        <aside class="m-drawer-panel" @click.stop>
          <div class="m-drawer-header">
            <div class="m-logo-mark">
              <CheckSquare :size="16" color="#fff" />
            </div>
            <div>
              <div class="m-nav-title">TaskFlow Pro</div>
              <div class="m-nav-sub" style="color:var(--text-muted)">智能待办</div>
            </div>
            <button class="m-icon-btn" style="margin-left:auto" @click="close" aria-label="关闭">
              <X :size="20" />
            </button>
          </div>

          <div class="m-drawer-body">
            <div class="sidebar-section-title">视图</div>
            <div v-for="item in navItems" :key="item.nav"
              class="sidebar-item" :class="{ active: store.activeNav === item.nav }"
              @click="selectNav(item.route)">
              <component :is="item.icon" :size="15" />
              {{ item.label }}
              <span class="badge" :class="item.badgeClass">{{ store.navBadges[item.badgeKey] }}</span>
            </div>

            <div class="sidebar-section-title">优先级</div>
            <div v-for="p in priorities" :key="p.nav"
              class="sidebar-item" :class="{ active: store.activeNav === p.nav }"
              @click="selectNav(p.route)">
              <span :style="{ width: '8px', height: '8px', background: p.color, borderRadius: '50%', flexShrink: 0, display: 'inline-block' }"></span>
              {{ p.label }}
              <span class="badge" :style="{ background: p.color }">{{ store.navBadges[p.badgeKey] }}</span>
            </div>

            <div class="sidebar-section-title">类别</div>
            <div v-for="cat in store.categories" :key="cat.id"
              class="sidebar-item" :class="{ active: store.activeNav === 'cat-' + cat.id }"
              @click="selectNav('/category/' + cat.id)">
              <span :style="{ width: '8px', height: '8px', background: cat.color, borderRadius: '50%', flexShrink: 0, display: 'inline-block' }"></span>
              {{ cat.name }}
              <span class="badge" :style="{ background: cat.color }">{{ store.categoryBadges[cat.id] || 0 }}</span>
            </div>

            <div class="m-drawer-footer">
              <button class="btn-secondary" style="flex:1" @click="lockApp">
                <Lock :size="14" /> 锁定
              </button>
              <button class="btn-secondary" style="flex:1" @click="openSettings">
                <Settings :size="14" /> 设置
              </button>
            </div>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '../../stores/taskStore.js'
import { CheckSquare, X, Lock, Settings, Layers, Calendar, CalendarRange, AlertTriangle, CheckCircle2 } from 'lucide-vue-next'

const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue', 'open-settings'])

const store = useTaskStore()
const router = useRouter()

const navItems = [
  { nav: 'all', label: '全部任务', icon: Layers, badgeKey: 'all', badgeClass: '', route: '/' },
  { nav: 'today', label: '今日', icon: Calendar, badgeKey: 'today', badgeClass: '', route: '/today' },
  { nav: 'week', label: '本周', icon: CalendarRange, badgeKey: 'week', badgeClass: '', route: '/week' },
  { nav: 'overdue', label: '已逾期', icon: AlertTriangle, badgeKey: 'overdue', badgeClass: 'danger', route: '/overdue' },
  { nav: 'done', label: '已完成', icon: CheckCircle2, badgeKey: 'done', badgeClass: '', route: '/done' },
]

const priorities = [
  { nav: 'p-critical', label: '紧急', color: '#ef4444', badgeKey: 'critical', route: '/priority/critical' },
  { nav: 'p-high', label: '高', color: '#f97316', badgeKey: 'high', route: '/priority/high' },
  { nav: 'p-medium', label: '中', color: '#f59e0b', badgeKey: 'medium', route: '/priority/medium' },
  { nav: 'p-low', label: '低', color: '#22c55e', badgeKey: 'low', route: '/priority/low' },
]

function close() { emit('update:modelValue', false) }
function selectNav(routePath) {
  router.push(routePath)
  close()
}
function lockApp() {
  store.lockApp()
  close()
}
function openSettings() {
  emit('open-settings')
  close()
}

watch(() => props.modelValue, (open) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = open ? 'hidden' : ''
})

onUnmounted(() => {
  if (typeof document !== 'undefined') document.body.style.overflow = ''
})
</script>
