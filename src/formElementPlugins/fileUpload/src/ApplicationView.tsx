import React, { useEffect, useState } from 'react'
import { Icon, List, Segment, Transition } from 'semantic-ui-react'
import { nanoid } from 'nanoid'
import { ApplicationViewProps } from '../../types'
import { TranslatePluginMethod, useLanguageProvider } from '../../../contexts/Localisation'
import { useUserState } from '../../../contexts/UserState'
import { postRequest } from '../../../utils/helpers/fetchMethods'
import { FileDisplay, FileDisplayWithDescription } from './components'
import getServerUrl from '../../../utils/helpers/endpoints/endpointUrlBuilder'
import useDefault from '../../useDefault'
import { usePrefs } from '../../../contexts/SystemPrefs'
import { useSimpleCache } from '../../../utils/hooks/useSimpleCache'
import { UploadButton } from '../../../components/common'

export interface FileResponseData {
  uniqueId: string
  filename: string
  fileUrl: string
  thumbnailUrl: string
  mimetype: string
  description?: string
}

interface FileUploadServerResponse {
  success: boolean
  fileData?: FileResponseData[]
}

export interface FileInfo {
  key: string
  filename: string
  loading: boolean
  error: boolean
  errorMessage?: string | null
  fileData?: FileResponseData | null
}

const ApplicationView: React.FC<ApplicationViewProps> = ({
  element,
  parameters,
  onSave,
  Markdown,
  currentResponse,
  applicationData,
}) => {
  const { getPluginTranslator } = useLanguageProvider()
  const t = getPluginTranslator('fileUpload')
  const { preferences } = usePrefs()
  const { isEditable } = element
  const {
    label,
    description,
    fileCountLimit,
    fileExtensions,
    fileSizeLimit,
    default: defaultValue,
    showDocumentModal = preferences.showDocumentModal,
    showDescription = false,
    showFileRestrictions = true,
    ...fileOptions
  } = parameters

  // These values required for file upload query parameters:
  const {
    userState: { currentUser },
  } = useUserState()

  const application_response_id = currentResponse?.id
  const serialNumber = applicationData.serial

  const [uploadedFiles, setUploadedFiles] = useState<FileInfo[]>(
    generateInitialFileData(currentResponse?.files ?? [])
  )
  const [error, setError] = useState<string>()
  const [errorVisible, setErrorVisible] = useState(false)
  // FileCache is to store the actual file contents after uploading, so when the
  // user previews it again they don't have to wait for it to re-download
  const { addToCache, removeFromCache, getFromCache } = useSimpleCache<File>()

  useEffect(() => {
    // Set response to null if no files
    if (uploadedFiles.length === 0) {
      onSave(null)
      return
    }
    // Only store files that aren't error or loading
    const fileDataToSave = uploadedFiles
      .filter(({ loading, error, fileData }) => !(loading || error) && fileData)
      .map(({ fileData }) => fileData)
    onSave({
      text: createTextString(fileDataToSave as FileResponseData[]),
      files: fileDataToSave,
    })
  }, [uploadedFiles])

  useDefault({
    defaultValue,
    currentResponse,
    parameters,
    onChange: (defaultFiles) => {
      setUploadedFiles(generateInitialFileData(defaultFiles?.files ?? []))
    },
  })

  const errors = [
    {
      condition: (file: any) => uploadedFiles.map((f) => f.filename).includes(file.name),
      errorMessage: t('ERROR_FILE_ALREADY_UPLOADED'),
    },
    {
      condition: (file: any) =>
        fileExtensions && !fileExtensions.includes(file.name.split('.').pop().toLowerCase()),
      errorMessage: t('ERROR_FILE_TYPE_NOT_PERMITTED'),
    },
    {
      condition: (file: any) => file.size > fileSizeLimit * 1000,
      errorMessage: t('ERROR_FILE_TOO_BIG'),
    },
    {
      condition: (_: any, newFileData: FileInfo[]) => newFileData.length >= fileCountLimit,
      errorMessage: t('ERROR_TOO_MANY_FILES'),
    },
  ]

  const showError = (error: string) => {
    setError(error)
    setErrorVisible(true)
    setTimeout(() => setErrorVisible(false), 3000)
  }

  const handleFiles = async (e: any) => {
    const newFileData: FileInfo[] = [...uploadedFiles]
    const files: any[] = Array.from(e.target.files)

    for (const file of files) {
      const error = errors.find((error) => error.condition(file, newFileData))
      if (error) showError(error.errorMessage)
      else {
        const key = nanoid(10)
        newFileData.unshift({ key, filename: file.name, loading: true, error: false })
        file.key = key
      }
    }
    setUploadedFiles([...newFileData])
    files.forEach(async (file: any) => {
      if (file?.error) return
      const result: FileUploadServerResponse = await uploadFile(file, {
        serialNumber,
        userId: currentUser?.userId ?? null,
        applicationResponseId: application_response_id,
        ...fileOptions,
      })
      const index = newFileData.findIndex((f: any) => f.key === file.key)
      if (result.success) {
        newFileData[index] = {
          ...newFileData[index],
          loading: false,
          fileData: result?.fileData?.[0],
        }
        const uniqueId = result?.fileData?.[0]?.uniqueId
        if (uniqueId) addToCache(uniqueId, file)
      } else showError(t('ERROR_UPLOAD_PROBLEM'))

      setUploadedFiles([...newFileData])
    })
  }

  const handleDelete = async (key: string) => {
    const file = uploadedFiles.find((f) => f.key === key)
    const uniqueId = file?.fileData?.uniqueId
    if (uniqueId) removeFromCache(uniqueId)
    setUploadedFiles(uploadedFiles.filter((file) => file.key !== key))
  }

  const handleUpdateDescription = async (uniqueId: string, value: string, key: string) => {
    try {
      // Save description to database file record
      await updateFileDescription(uniqueId, value || null)
      // Update response
      const index = uploadedFiles.findIndex((f) => f.key === key)
      const newFiles = [...uploadedFiles]
      newFiles[index].fileData = {
        ...newFiles[index].fileData,
        description: value,
      } as FileResponseData
      setUploadedFiles(newFiles)
    } catch (err) {
      console.warn('Error', (err as Error).message)
    }
  }

  return (
    <>
      {label && (
        <label>
          <Markdown text={label} semanticComponent="noParagraph" />
        </label>
      )}
      <Markdown text={description} />
      <Segment.Group>
        <Segment basic textAlign="center">
          {(uploadedFiles.length < fileCountLimit || !fileCountLimit) && (
            <UploadButton primary disabled={!isEditable} handleFiles={handleFiles}>
              <Icon name="upload" />
              {uploadedFiles.length === 0
                ? t('BUTTON_CLICK_TO_UPLOAD')
                : t('BUTTON_UPLOAD_ANOTHER')}
            </UploadButton>
          )}
        </Segment>
        <List className="file-list" horizontal={!showDescription} verticalAlign="top">
          {uploadedFiles.map((file) =>
            showDescription ? (
              <FileDisplayWithDescription
                key={file.key}
                file={file}
                onDelete={handleDelete}
                updateDescription={handleUpdateDescription}
                showDocumentModal={showDocumentModal}
                cachedFile={getFromCache(file?.fileData?.uniqueId ?? '')}
              />
            ) : (
              <FileDisplay
                key={file.key}
                file={file}
                onDelete={handleDelete}
                showDocumentModal={showDocumentModal}
                cachedFile={getFromCache(file?.fileData?.uniqueId ?? '')}
              />
            )
          )}
        </List>

        <Transition visible={errorVisible} duration={{ hide: 500, show: 200 }}>
          <p
            className="error-colour"
            style={{ position: 'absolute', bottom: 3, width: '100%', textAlign: 'center' }}
          >
            {error}
          </p>
        </Transition>
      </Segment.Group>
      {showFileRestrictions && (
        <FileRestrictions fileExtensions={fileExtensions} maxSize={fileSizeLimit} t={t} />
      )}
    </>
  )
}

const FileRestrictions: React.FC<{
  fileExtensions?: string[]
  maxSize?: number
  t: TranslatePluginMethod
}> = ({ fileExtensions, maxSize, t }) => {
  return (
    <p className="smaller-text" style={{ padding: 5, marginTop: -10 }}>
      {fileExtensions && (
        <>
          {`${t('ALLOWED_FORMATS')} ${fileExtensions.map((f) => '.' + f).join(', ')}`}
          <br />
        </>
      )}
      {maxSize && `${t('MAX_SIZE')} ${fileSizeWithUnits(maxSize)}`}
    </p>
  )
}

export default ApplicationView

const uploadFile = async (
  file: any,
  {
    userId,
    serialNumber,
    applicationResponseId,
    ...fileOptions
  }: {
    userId: number | null
    serialNumber: string
    applicationResponseId?: number
    fileOptions?: any
  }
) => {
  const fileData = new FormData()
  await fileData.append('file', file)
  return await postRequest({
    url: getServerUrl('upload', {
      userId,
      applicationSerial: serialNumber,
      applicationResponseId: applicationResponseId,
      ...fileOptions,
    }),
    otherBody: fileData,
  })
}

const updateFileDescription = async (uniqueId: string, description: string | null) => {
  if (description === '') return
  return await postRequest({
    url: getServerUrl('upload', { uniqueId, description }),
  })
}

const createTextString = (files: FileResponseData[]) =>
  files.reduce(
    (output, file) => output + (output === '' ? file.filename : ', ' + file.filename),
    ''
  )

const generateInitialFileData = (files: FileResponseData[]): FileInfo[] => {
  if (!files) return []
  return files.map((file) => ({
    key: nanoid(10),
    filename: file.filename,
    loading: false,
    error: false,
    errorMessage: null,
    fileData: file,
  }))
}

const fileSizeWithUnits = (size: number): string => {
  if (size < 1000) return `${size} kB`
  const sizeInMB = size / 1000
  if (size < 100_000) return `${parseInt(String(sizeInMB * 10)) / 10} MB`
  return `${parseInt(String(size / 1000))} MB`
}
