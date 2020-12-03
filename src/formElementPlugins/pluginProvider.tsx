import React from 'react'
import { PluginManifest, PluginComponents, Plugins } from './types'

const PLUGIN_COMPONENTS = ['ApplicationView', 'TemplateView', 'SummaryView']
const PLUGIN_ERRORS = {
  PLUGIN_NOT_IN_MANIFEST: 'Plugin is not present in plugin manifest',
  PLUGINS_NOT_LOADED: 'Plugins are not loaded, check connection with server',
}

let pluginProviderInstance: pluginProvider | null = null

class pluginProvider {
  // Have to add ! since constructor may not declare = {}, due to if statement with return
  plugins!: Plugins
  pluginManifest!: PluginManifest

  constructor() {
    if (pluginProviderInstance) return pluginProviderInstance
    pluginProviderInstance = this

    this.plugins = {}
    // Needs to be called when app loads (REST call to back end)
    // TODO
    this.pluginManifest = {
      shortText: {
        displayName: 'Basic Text Input',
        isCore: true,
        folderName: 'shortText',
        category: 'Input',
      },
      textInfo: {
        isCore: true,
        displayName: 'Static Text',
        folderName: 'textInfo',
        category: 'Informative',
      },
      dropdownChoice: {
        isCore: true,
        displayName: 'Drop-down Selector',
        folderName: 'dropdownChoice',
        category: 'Input',
      },
    }
  }

  getPluginElement(code: string) {
    if (Object.values(this.pluginManifest).length == 0)
      return returnWithError(new Error(PLUGIN_ERRORS.PLUGINS_NOT_LOADED))

    const { [code]: pluginConfig } = this.pluginManifest
    if (!pluginConfig) return returnWithError(new Error(PLUGIN_ERRORS.PLUGIN_NOT_IN_MANIFEST))

    if (this.plugins[code]) return this.plugins[code]

    if (process.env.development || pluginConfig.isCore) {
      this.plugins[code] = getLocalElementPlugin(pluginConfig.folderName)
    } else {
      this.plugins[code] = getRemoteElementPlugin(pluginConfig.folderName)
    }
    return this.plugins[code]
  }
}

function getLocalElementPlugin(folderName: string) {
  const result: PluginComponents = {}
  result.config = require(`./${folderName}/pluginConfig.json`)
  // TO-DO: optimize so it only imports the component type (Application, Template, Summary) that is required
  PLUGIN_COMPONENTS.forEach((componentName) => {
    result[componentName] = React.lazy(
      // the exlude comment is to tell webpack not to include node_modules in possible
      // lazy imports, so when we are developing a new remote plugin, it will have node_modules
      // folder, during development it will be lazy loaded with this command
      () => import(/* webpackExclude: /node_modules/ */ `./${folderName}/src/${componentName}`)
    )
  })

  return result
}

// Since the interface for getPluginElement should always return { pluginComponents }
// this helper will return a reject with an error
function returnWithError(error: Error) {
  const result: PluginComponents = {}
  PLUGIN_COMPONENTS.forEach(
    (componentName) =>
      (result[componentName] = React.lazy(async () => {
        throw error
      }))
  )

  return result
}

function getRemoteElementPlugin(code: string) {
  const result: PluginComponents = {}
  PLUGIN_COMPONENTS.forEach((componentName) => {
    // TODO will be added in another PR
    result[componentName] = () => <div>Not Implemented</div>
  })
  return result
}

export default new pluginProvider()
export { PLUGIN_ERRORS }
