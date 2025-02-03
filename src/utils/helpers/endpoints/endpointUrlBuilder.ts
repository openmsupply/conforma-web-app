import config from '../../../config'
import {
  GetServerUrlFunction,
  LanguageOptions,
  FilesOptions,
  UserPermissionsOptions,
  VerifyOptions,
  CheckTriggersOptions,
  FileOptions,
  DataViewOptions,
  LocalisationOptions,
  SnapshotOptions,
  LookupTableOptions,
  TemplateOptions,
  GetApplicationDataOptions,
  ArchiveOptions,
  FigTreeFragmentsEndpoint,
} from './types'

const { VITE_USE_DEV_SERVER } = import.meta.env

const {
  isProductionBuild,
  restEndpoints,
  devServerRest,
  devServerGraphQL,
  productionPathREST,
  productionPathGraphQL,
} = config
const { port, hostname, protocol } = window.location
const getProductionUrl = (path: string) => {
  return `${protocol}//${hostname}${port ? `:${port}` : ''}${path}`
}

export const serverREST = isProductionBuild
  ? VITE_USE_DEV_SERVER
    ? devServerRest
    : getProductionUrl(productionPathREST)
  : devServerRest
export const serverGraphQL = isProductionBuild
  ? VITE_USE_DEV_SERVER
    ? devServerGraphQL
    : getProductionUrl(productionPathGraphQL)
  : devServerGraphQL
const serverWebSocket = serverREST
  .replace('http', 'ws')
  .replace('api', '')
  .replace('server', 'websocket')

const getServerUrl: GetServerUrlFunction = (endpointKey, options = undefined) => {
  if (endpointKey === 'graphQL') return serverGraphQL
  const endpointPath = restEndpoints[endpointKey]

  switch (endpointKey) {
    case 'public':
    case 'prefs':
    case 'login':
    case 'loginOrg':
    case 'userInfo':
    case 'createHash':
    case 'generatePDF':
    case 'admin':
    case 'previewActions':
    case 'extendApplication':
    case 'getAllPrefs':
    case 'setPrefs':
    case 'setMaintenanceMode':
      return serverREST + endpointPath

    case 'userPermissions':
    case 'checkUnique':
    case 'upload':
      return `${serverREST}${endpointPath}${buildQueryString(options as UserPermissionsOptions)}`

    case 'language': {
      const { code } = options as LanguageOptions
      return `${serverREST}${endpointPath}/${code}`
    }

    case 'file': {
      const { fileId, thumbnail = false } = options as FileOptions
      return `${serverREST}${endpointPath}?uid=${fileId}${thumbnail ? '&thumbnail=true' : ''}`
    }

    case 'files': {
      return `${serverREST}${endpointPath}${buildQueryString(options as FilesOptions)}`
    }

    case 'verify': {
      const { uid } = options as VerifyOptions
      return `${serverREST}${endpointPath}?uid=${uid}`
    }

    case 'checkTrigger': {
      const { serial } = options as CheckTriggersOptions
      return `${serverREST}${endpointPath}?serial=${serial}`
    }

    case 'dataViews': {
      const dataViewOptions = (options as DataViewOptions) ?? {}
      const { dataViewCode } = dataViewOptions

      // List view
      if (!dataViewCode) return `${serverREST}${endpointPath}`

      // Detail view
      if ('itemId' in dataViewOptions) {
        const { itemId } = dataViewOptions
        return `${serverREST}${endpointPath}/${dataViewCode}/${itemId}`
      }

      // Filter list
      if ('column' in dataViewOptions) {
        const { column } = dataViewOptions
        return `${serverREST}${endpointPath}/${dataViewCode}/filterList/${column}`
      }

      // Table view
      const { query } = dataViewOptions
      return `${serverREST}${endpointPath}/${dataViewCode}${buildQueryString(query)}`
    }

    // Localisation management
    case 'localisation': {
      const localisationOptions = options as LocalisationOptions
      const { action } = localisationOptions

      // Get all
      if (action === 'getAll') return `${serverREST}${endpointPath}/get-all`

      // Enable/disable
      if (action === 'enable') {
        const { code, enabled } = localisationOptions
        return `${serverREST}${endpointPath}/enable?code=${code}&enabled=${enabled}`
      }

      // Install
      if (action === 'install') return `${serverREST}${endpointPath}/install`

      // Remove
      if (action === 'remove')
        return `${serverREST}${endpointPath}/remove?code=${localisationOptions.code}`

      throw new Error('Missing options')
    }

    case 'snapshot': {
      const snapshotOptions = options as SnapshotOptions
      const { action } = snapshotOptions
      const isArchive = 'archive' in snapshotOptions && snapshotOptions.archive

      if (action === 'list')
        return `${serverREST}${endpointPath}/list${isArchive ? '?archive=true' : ''}`

      const name = 'name' in snapshotOptions ? snapshotOptions.name : null

      if (action === 'upload') return `${serverREST}${endpointPath}/upload`

      if (!name) throw new Error('Name parameter missing in snapshot endpoint query')

      // "download" is direct download url
      if (action === 'download')
        return `${serverREST}${endpointPath}/files/${isArchive ? '_archives/' : ''}${name}.zip`

      if (action === 'delete')
        return `${serverREST}${endpointPath}/${action}?name=${name}${
          isArchive ? '&archive=true' : ''
        }`

      // Must be "take" or "use"
      return `${serverREST}${endpointPath}/${action}?name=${name}${
        isArchive ? `&type=archive` : ''
      }`
      // Archive details are passed in Body JSON
    }

    case 'lookupTable': {
      const lookupTableOptions = options as LookupTableOptions
      const { action } = lookupTableOptions

      // List structures
      if (action === 'list') return `${serverREST}${endpointPath}/list`

      // Single table structure
      if (action === 'table') return `${serverREST}${endpointPath}/table/${lookupTableOptions.id}`

      // Import
      if (action === 'import') {
        const { name, code } = lookupTableOptions
        return `${serverREST}${endpointPath}/import?name=${name}&code=${code}`
      }

      // "Update" uses /import/tableID route
      if (action === 'update') {
        const { id, name, code } = lookupTableOptions
        return `${serverREST}${endpointPath}/import/${id}?name=${name}&code=${code}`
      }

      // Export
      return `${serverREST}${endpointPath}/export/${lookupTableOptions.id}`
    }

    // Template Export/Import
    case 'templateImportExport': {
      const templateOptions = options as TemplateOptions
      const { action } = templateOptions
      const id = 'id' in templateOptions && templateOptions.id
      const type = 'type' in templateOptions && templateOptions.type

      switch (action) {
        case 'check':
          return `${serverREST}${endpointPath}/check/${id}`
        case 'commit':
          return `${serverREST}${endpointPath}/commit/${id}`
        case 'duplicate':
          return `${serverREST}${endpointPath}/duplicate/${type}/${id}`
        case 'export':
          return `${serverREST}${endpointPath}/export/${id}`
        case 'import':
          if (type === 'install' && 'uid' in templateOptions)
            return `${serverREST}${endpointPath}/import/${type}/${templateOptions.uid}`
          if (
            type === 'getEntityDetail' &&
            'uid' in templateOptions &&
            'group' in templateOptions &&
            'name' in templateOptions
          )
            return `${serverREST}${endpointPath}/import/get-full-entity-diff/${templateOptions.uid}?type=${templateOptions.group}&value=${templateOptions.name}`
          return `${serverREST}${endpointPath}/import/${type}`
        case 'getDataViewDetails':
          return `${serverREST}${endpointPath}/get-data-view-details/${id}`
        case 'getLinkedFiles':
          return `${serverREST}${endpointPath}/get-linked-files/${id}`
      }
      break
    }

    case 'figTreeFragments': {
      const { frontOrBack } = options as FigTreeFragmentsEndpoint[1]
      return `${serverREST}${endpointPath}/${frontOrBack}`
    }

    case 'getApplicationData': {
      const { applicationId, reviewId } = options as GetApplicationDataOptions
      return `${serverREST}${endpointPath}?applicationId=${applicationId}${
        reviewId ? `&reviewId=${reviewId}` : ''
      }`
    }

    case 'archiveFiles': {
      const { days } = options as ArchiveOptions
      return `${serverREST}${endpointPath}?days=${days}`
    }

    case 'serverStatus':
      return `${serverWebSocket}${endpointPath}`

    default: {
      // "never" type ensures we will get a *compile-time* error if we are
      // missing a case defined in Endpoints types
      const missingValue: never = endpointKey
      throw new Error('Failed to consider case:' + missingValue)
    }
  }
}

const buildQueryString = (query?: Record<string, any>): string => {
  if (!query) return ''
  const keyValStrings = Object.entries(query)
    .filter(([_, value]) => !!value)
    .map(([key, value]) => `${key}=${value}`)
  return '?' + keyValStrings.join('&')
}

export default getServerUrl
