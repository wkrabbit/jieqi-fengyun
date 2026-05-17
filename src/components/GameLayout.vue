<script setup lang="ts">
import ChessBoard from './ChessBoard.vue'
import SidePanel from './SidePanel.vue'
import WinDialog from './WinDialog.vue'
</script>

<template>
  <div class="min-h-screen bg-stone-800 flex items-center justify-center">
    <div class="flex flex-col md:flex-row items-center gap-4 p-4">
      <ChessBoard />
      <SidePanel />
    </div>
    <WinDialog />
  </div>
</template>
