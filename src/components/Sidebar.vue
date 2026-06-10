<template>
  <aside class="sidebar">
    <div class="sidebar-section-title">视图</div>
    <div v-for="item in navItems" :key="item.nav"
      class="sidebar-item" :class="{ active: store.activeNav === item.nav }"
      @click="router.push(item.route)">
      <component :is="item.icon" :size="15" />
      {{ item.label }}
      <span class="badge" :class="item.badgeClass">{{ store.navBadges[item.badgeKey] }}</span>
    </div>

    <div class="sidebar-section-title">优先级</div>
    <div v-for="p in priorities" :key="p.nav"
      class="sidebar-item" :class="{ active: store.activeNav === p.nav }"
      @click="router.push(p.route)">
      <span :style="{ width: '8px', height: '8px', background: p.color, borderRadius: '50%', flexShrink: 0, display: 'inline-block' }"></span>
      {{ p.label }}
      <span class="badge" :style="{ background: p.color }">{{ store.navBadges[p.badgeKey] }}</span>
    </div>

    <div class="sidebar-section-title">类别</div>
    <div v-for="cat in store.categories" :key="cat.id"
      class="sidebar-item" :class="{ active: store.activeNav === 'cat-' + cat.id }"
      @click="router.push('/category/' + cat.id)">
      <span :style="{ width: '8px', height: '8px', background: cat.color, borderRadius: '50%', flexShrink: 0, display: 'inline-block' }"></span>
      {{ cat.name }}
      <span class="badge" :style="{ background: cat.color }">{{ store.categoryBadges[cat.id] || 0 }}</span>
    </div>

    <div style="margin-top:auto;padding-top:16px;"></div>
    <div style="padding: 10px 12px; background: var(--accent-light); border-radius: 10px; margin-top: 8px;">
      <div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:6px;">本周完成率</div>
      <div style="font-size:22px;font-weight:800;color:var(--text-primary);">{{ store.weeklyRate }}%</div>
      <div style="height:5px;background:var(--border-color);border-radius:99px;margin-top:6px;overflow:hidden;">
        <div :style="{ height: '100%', background: 'var(--accent)', borderRadius: '99px', transition: 'width 0.4s ease', width: store.weeklyRate + '%' }"></div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useTaskStore } from '../stores/taskStore.js'
import { Layers, Calendar, CalendarRange, AlertTriangle, CheckCircle2 } from 'lucide-vue-next'

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
</script>
