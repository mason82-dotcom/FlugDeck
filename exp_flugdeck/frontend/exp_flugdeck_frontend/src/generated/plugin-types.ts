// 本文件由 fh2-plugin generate 生成，请勿手改。
// 来源 Manifest: exp_flugdeck_frontend@0.3.0

export type ExtensionId =
  | 'status-panel'
  | 'flightlog-sidebar'
  | 'plan-note'
  | 'alert-popup'

export interface ExtensionsByHost {
  readonly cockpit: 'status-panel';
  readonly project: 'flightlog-sidebar';
  readonly plan: 'plan-note';
  readonly message: 'alert-popup';
}

export type ViewId =
  | 'status-panel'
  | 'flightlog-page'
  | 'plan-note'
  | 'alert-popup'

export interface PluginConfig {
}

export type AppCockpitContext = import('fh2-plugin-sdk').CockpitPluginContext<PluginConfig, {
  readonly 'status-panel': 'cockpit.ui.left-panel';
}>
export type AppProjectContext = import('fh2-plugin-sdk').PluginContext<PluginConfig, {
  readonly 'flightlog-sidebar': 'project.sidebar-actions';
}>
export type AppPlanContext = import('fh2-plugin-sdk').PluginContext<PluginConfig, {
  readonly 'plan-note': 'plan.form-extensions';
}>
export type AppMessageContext = import('fh2-plugin-sdk').PluginContext<PluginConfig, {
  readonly 'alert-popup': 'message.alert-popups';
}>

export type { CockpitPluginContext, PluginContext } from 'fh2-plugin-sdk'
