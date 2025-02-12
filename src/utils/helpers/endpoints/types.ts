import { ModifiedEntities } from '../../../containers/TemplateBuilder/templateOperations/EntitySelectModal'
import { DataViewTableAPIQueries } from '../../types'

export type BasicEndpoint =
  // These ones don't take any query parameters or sub-routes
  | 'public'
  | 'prefs'
  | 'login'
  | 'loginOrg'
  | 'userInfo'
  | 'createHash'
  | 'generatePDF'
  | 'previewActions'
  | 'extendApplication'
  | 'admin'
  | 'getAllPrefs'
  | 'setPrefs'
  | 'setMaintenanceMode'
  | 'serverStatus'

export type LanguageKey = 'language'
export type LanguageOptions = { code: string }

export type VerifyKey = 'verify'
export type VerifyOptions = { uid: string }

export type FileKey = 'file'
export type FileOptions = { fileId: string; thumbnail?: boolean }

export type FilesKey = 'files'
export type FilesOptions = {
  applicationId?: number
  outputOnly?: boolean
  external?: boolean
  internal?: boolean
}

export type GetApplicationDataKey = 'getApplicationData'
export type GetApplicationDataOptions = { applicationId: number; reviewId?: number }

export type UserPermissionsKey = 'userPermissions'
export type UserPermissionsOptions = { username?: string; orgId?: number | null }

export type CheckUniqueKey = 'checkUnique'
export type CheckUniqueOptions = (
  | {
      type: 'username' | 'email' | 'organisation'
    }
  | {
      table: string
      field: string
    }
) & { value: string; caseInsensitive?: boolean }

export type CheckTriggersKey = 'checkTrigger'
export type CheckTriggersOptions = { serial: string }

export type UploadKey = 'upload'
export type UploadOptions = {
  userId?: number | null
  applicationSerial?: string
  applicationResponseId?: number
  applicationNoteId?: number
  uniqueId?: string
  templateId?: string
  subfolder?: string
  description?: string | null
}

export type DataViewKey = 'dataViews'
export type DataViewOptions =
  | { dataViewCode: string; query?: DataViewTableAPIQueries }
  | { dataViewCode: string; itemId: number }
  | { dataViewCode: string; column: string }

export type LocalisationKey = 'localisation'
export type LocalisationOptions =
  | {
      action: 'getAll'
    }
  | {
      action: 'enable'
      code: string
      enabled: boolean
    }
  | {
      action: 'remove'
      code: string
    }
  | {
      action: 'install'
    }

export type SnapshotKey = 'snapshot'
export type SnapshotOptions =
  | { action: 'list'; archive?: boolean }
  | { action: 'download' | 'delete'; name: string; archive?: boolean }
  | { action: 'upload' }
  | {
      action: 'take' | 'use'
      name: string
      archive?: boolean
    }

export type LookupTableKey = 'lookupTable'
export type LookupTableOptions =
  | {
      action: 'list'
    }
  | {
      action: 'table'
      id: number
    }
  | {
      action: 'import'
      name: string
      code: string
    }
  | {
      action: 'export'
      id: number
    }
  | {
      action: 'update'
      id: number
      name: string
      code: string
    }

export type TemplateKey = 'templateImportExport'
export type TemplateOptions =
  | { action: 'check'; id: number }
  | { action: 'commit'; id: number }
  | { action: 'duplicate'; id: number; type: 'new' | 'version' }
  | { action: 'export'; id: number }
  | { action: 'import'; type: 'upload' }
  | {
      action: 'import'
      type: 'getEntityDetail'
      uid: string
      group: keyof ModifiedEntities
      name: string
    }
  | { action: 'import'; type: 'install'; uid: string }
  | { action: 'getDataViewDetails'; id: number }
  | { action: 'getLinkedFiles'; id: number }

export type ArchiveKey = 'archiveFiles'
export type ArchiveOptions = { days: number }

export type FigTreeFragmentsKey = 'figTreeFragments'
export type FigTreeFragmentsOptions = { frontOrBack: 'frontEnd' | 'backEnd' }

export type GetServerUrlFunction = ((endpointKey: BasicEndpoint) => string) &
  ((endpointKey: 'graphQL') => string) &
  ((endpointKey: LanguageKey, options: LanguageOptions) => string) &
  ((endpointKey: VerifyKey, options: VerifyOptions) => string) &
  ((endpointKey: FileKey, options: FileOptions) => string) &
  ((endpointKey: FilesKey, options: FilesOptions) => string) &
  ((endpointKey: UserPermissionsKey, options: UserPermissionsOptions) => string) &
  ((endpointKey: CheckUniqueKey, options: CheckUniqueOptions) => string) &
  ((endpointKey: CheckTriggersKey, options: CheckTriggersOptions) => string) &
  ((endpointKey: UploadKey, options: UploadOptions) => string) &
  ((endpointKey: DataViewKey, options?: DataViewOptions) => string) &
  ((endpointKey: LocalisationKey, options: LocalisationOptions) => string) &
  ((endpointKey: SnapshotKey, options: SnapshotOptions) => string) &
  ((endpointKey: LookupTableKey, options: LookupTableOptions) => string) &
  ((endpointKey: TemplateKey, options: TemplateOptions) => string) &
  ((endpointKey: ArchiveKey, options: ArchiveOptions) => string) &
  ((endpointKey: GetApplicationDataKey, options: GetApplicationDataOptions) => string) &
  ((endpointKey: FigTreeFragmentsKey, options: FigTreeFragmentsOptions) => string)
