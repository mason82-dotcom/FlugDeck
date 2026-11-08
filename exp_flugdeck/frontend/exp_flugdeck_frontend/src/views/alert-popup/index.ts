import { createApp } from 'vue'
import { defineView } from 'fh2-plugin-sdk/view'
import { alertPopup } from './contract'
import AlertPopup from './AlertPopup.vue'

export default defineView({
  mount (ctx) {
    const client = alertPopup.client(ctx.port)
    const app = createApp(AlertPopup, { client })
    app.mount(ctx.mountElement)
    return { dispose () { app.unmount(); client.dispose() } }
  },
})
