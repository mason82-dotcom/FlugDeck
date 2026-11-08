import { createApp } from 'vue'
import { defineView } from 'fh2-plugin-sdk/view'
import { statusPanel } from './contract'
import Panel from './Panel.vue'

export default defineView({
  mount (ctx) {
    const client = statusPanel.client(ctx.port)
    const app = createApp(Panel, { client })
    app.mount(ctx.mountElement)
    return { dispose () { app.unmount(); client.dispose() } }
  },
})
