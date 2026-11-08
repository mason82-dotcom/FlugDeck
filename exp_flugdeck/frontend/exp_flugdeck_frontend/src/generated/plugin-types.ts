// 本文件由 fh2-plugin generate 生成，请勿手改。
// 来源 Manifest: exp_flugdeck_frontend@0.5.0

export type ExtensionId =
  | 'status-panel'

export interface ExtensionsByHost {
  readonly cockpit: 'status-panel';
}

export type ViewId =
  | 'status-panel'

export interface PluginConfig {
}

export type AppCockpitContext = import('fh2-plugin-sdk').CockpitPluginContext<PluginConfig, {
  readonly 'status-panel': 'cockpit.ui.left-panel';
}>

export type { CockpitPluginContext, PluginContext } from 'fh2-plugin-sdk'
