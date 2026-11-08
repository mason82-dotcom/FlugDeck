import { createApp } from 'vue'
import { defineView } from 'fh2-plugin-sdk/view'
import { planNote } from './contract'
import PlanNote from './PlanNote.vue'

export default defineView({
  mount (ctx) {
    const client = planNote.client(ctx.port)
    const app = createApp(PlanNote, { client })
    app.mount(ctx.mountElement)
    return { dispose () { app.unmount(); client.dispose() } }
  },
})
