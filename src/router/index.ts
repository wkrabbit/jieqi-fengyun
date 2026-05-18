import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../components/AuthModal.vue'),
    },
    {
      path: '/lobby',
      name: 'lobby',
      component: () => import('../components/LobbyView.vue'),
    },
    {
      path: '/game/local',
      name: 'game-local',
      component: () => import('../components/GameLayout.vue'),
    },
    {
      path: '/game/room/:code',
      name: 'game-room',
      component: () => import('../components/GameLayout.vue'),
      props: true,
    },
  ],
})

export default router
