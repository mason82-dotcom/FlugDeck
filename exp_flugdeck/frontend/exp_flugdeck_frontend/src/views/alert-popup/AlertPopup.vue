<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import type { AlertPopupClient, AlertPopupState } from './contract'

const { client } = defineProps<{ client: AlertPopupClient }>()
const state = ref<AlertPopupState>({ title: '', message: '' })
const subscription = client.state.subscribe(next => { state.value = next })
onUnmounted(() => subscription.dispose())
</script>
<template>
  <section class="fd" lang="de" role="alertdialog" aria-labelledby="flugdeck-alert-title" aria-describedby="flugdeck-alert-text">
    <h2 id="flugdeck-alert-title">{{ state.title || 'Flugdeck' }}</h2>
    <p id="flugdeck-alert-text">{{ state.message }}</p>
    <button type="button" @click="client.close()">Hinweis schließen</button>
  </section>
</template>
<style src="../shared/theme.css"></style>
<style scoped>
p { margin-block: 8px 14px; }
</style>
