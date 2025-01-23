import { useEffect, useState } from 'react'
import { getRequest } from '../../../../../utils/helpers/fetchMethods'
import getServerUrl from '../../../../../utils/helpers/endpoints/endpointUrlBuilder'
import { useTemplateState } from '../../TemplateWrapper'

interface LinkedFile {
  unique_id: string
  id?: number
  original_filename?: string
  description?: string | null
  timestamp?: Date
  file_size?: number | null
  linkedInDatabase: boolean
  usedInAction: boolean
  missingFromDatabase?: boolean
  joinId?: number
}

export const useFiles = () => {
  const { template } = useTemplateState()
  const [fileDetails, setFileDetails] = useState<
    (LinkedFile & { fileUrl: string; thumbnailUrl: string })[]
  >([])
  const [error, setError] = useState<string>('')

  useEffect(() => {
    getFiles()
  }, [])

  const getFiles = async () => {
    getRequest(
      getServerUrl('templateImportExport', {
        action: 'getLinkedFiles',
        id: template.id,
      })
    )
      .then((results) => {
        setFileDetails(
          results.map((file: LinkedFile) => ({
            ...file,
            fileUrl: getServerUrl('file', { fileId: file.unique_id }),
            thumbnailUrl: getServerUrl('file', { fileId: file.unique_id, thumbnail: true }),
          }))
        )
      })
      .catch((err) => {
        setError('Error: ' + err.message)
      })
  }

  return {
    fileDetails,
    error,
    refetch: getFiles,
  }
}
