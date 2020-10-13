import { TemplateElement } from '../generated/graphql'

interface OnUpdateApplicationView {
  (updateObject: { value?: any; isValid: boolean }): void
}

interface ApplicatioViewProps {
  templateElement: TemplateElement
  onUpdate: OnUpdateApplicationView
  isVisible: boolean
  isEditable: boolean
  // applicationState,
  // graphQLclient
  initialValue: any // Could be a primative or an object with any shape
}

interface OnUpdateTemplateWrapperView {
  (updateObject: { [key: string]: any }): void
}

interface TemplateViewWrapperProps {
  templateElement: TemplateElement
  onUpdate: OnUpdateTemplateWrapperView
}

interface OnUpdateTemplateView {
  (parameters: any): void
}

interface TemplateViewProps {
  parameters: any
  onUpdate: OnUpdateTemplateView
}

interface PluginConfig {
  isCore?: boolean
  folderName: string
  displayName: string
  category: 'Input' | 'Informative'
}

interface PluginManifest {
  [key: string]: PluginConfig
}

interface PluginComponents {
  [key: string]: React.FunctionComponent<ApplicatioViewProps | TemplateViewProps>
}

interface Plugins {
  [key: string]: PluginComponents
}
export {
  OnUpdateApplicationView,
  OnUpdateTemplateWrapperView,
  TemplateViewProps,
  OnUpdateTemplateView,
  ApplicatioViewProps,
  TemplateViewWrapperProps,
  PluginConfig,
  PluginManifest,
  PluginComponents,
  Plugins,
}
