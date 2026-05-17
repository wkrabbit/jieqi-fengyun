<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const auth = useAuthStore()

function goBack() {
  router.push('/lobby')
}

const tab = ref<'login' | 'register'>('login')
const username = ref('')
const password = ref('')
const email = ref('')
const localError = ref('')

async function submit() {
  localError.value = ''
  let ok: boolean
  if (tab.value === 'login') {
    ok = await auth.login(username.value, password.value)
  } else {
    ok = await auth.register(username.value, password.value, email.value || undefined)
  }
  if (ok) {
    router.push('/lobby')
  } else {
    localError.value = auth.error || '操作失败'
  }
}

function goLocal() {
  router.push('/game/local')
}
</script>

<template>
  <div class="min-h-screen bg-stone-800 flex items-center justify-center">
    <div class="bg-stone-700/60 rounded-2xl shadow-xl p-8 w-full max-w-sm mx-4">
      <h1 class="text-2xl font-bold text-amber-200 text-center mb-6">揭棋风云</h1>

      <!-- Tabs -->
      <div class="flex mb-6 bg-stone-800 rounded-lg p-0.5">
        <button
          :class="tab === 'login' ? 'bg-amber-600 text-white' : 'text-stone-300 hover:text-white'"
          class="flex-1 py-2 rounded-md text-sm font-semibold transition-colors"
          @click="tab = 'login'"
        >登录</button>
        <button
          :class="tab === 'register' ? 'bg-amber-600 text-white' : 'text-stone-300 hover:text-white'"
          class="flex-1 py-2 rounded-md text-sm font-semibold transition-colors"
          @click="tab = 'register'"
        >注册</button>
      </div>

      <!-- Form -->
      <form @submit.prevent="submit" class="flex flex-col gap-4">
        <input
          v-model="username"
          type="text"
          placeholder="用户名"
          required
          minlength="2"
          maxlength="20"
          class="bg-stone-800 border border-stone-600 rounded-lg px-4 py-2.5 text-stone-100 placeholder-stone-400
                 focus:outline-none focus:border-amber-500 transition-colors"
        />
        <input
          v-model="password"
          type="password"
          placeholder="密码"
          required
          minlength="4"
          class="bg-stone-800 border border-stone-600 rounded-lg px-4 py-2.5 text-stone-100 placeholder-stone-400
                 focus:outline-none focus:border-amber-500 transition-colors"
        />
        <input
          v-if="tab === 'register'"
          v-model="email"
          type="email"
          placeholder="邮箱（可选）"
          class="bg-stone-800 border border-stone-600 rounded-lg px-4 py-2.5 text-stone-100 placeholder-stone-400
                 focus:outline-none focus:border-amber-500 transition-colors"
        />

        <div v-if="localError" class="text-red-400 text-sm text-center">{{ localError }}</div>

        <button
          type="submit"
          :disabled="auth.loading"
          class="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg
                 transition-colors active:scale-[0.98]"
        >
          {{ auth.loading ? '请稍候...' : (tab === 'login' ? '登录' : '注册') }}
        </button>
      </form>

      <button
        @click="goBack"
        class="mt-4 w-full text-stone-400 hover:text-stone-200 text-sm transition-colors"
      >
        返回大厅
      </button>
      <button
        @click="goLocal"
        class="mt-2 w-full text-stone-500 hover:text-stone-300 text-sm transition-colors"
      >
        跳过登录，开始本地对战
      </button>
    </div>
  </div>
</template>
