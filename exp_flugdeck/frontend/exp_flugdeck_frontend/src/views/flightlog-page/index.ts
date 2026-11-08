import { createApp } from 'vue'
import { defineView } from 'fh2-plugin-sdk/view'
import { flightlogPage } from './contract'
import FlightlogPage from './FlightlogPage.vue'

export default defineView({
  mount (ctx) {
    const client = flightlogPage.client(ctx.port)
    const app = createApp(FlightlogPage, { client })
    app.mount(ctx.mountElement)
    return { dispose () { app.unmount(); client.dispose() } }
  },
})
