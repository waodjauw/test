import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'all', meta: { nav: 'all' } },
  { path: '/today', name: 'today', meta: { nav: 'today' } },
  { path: '/week', name: 'week', meta: { nav: 'week' } },
  { path: '/overdue', name: 'overdue', meta: { nav: 'overdue' } },
  { path: '/done', name: 'done', meta: { nav: 'done' } },
  { path: '/priority/:priority', name: 'priority', meta: { nav: null } },
  { path: '/category/:id', name: 'category', meta: { nav: null } },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
