import React from 'react'
import { Container, List, Header, Image } from 'semantic-ui-react'
import { Loading } from '../../../components/common'
import { FullStructure } from '../../../utils/types'
import { useLanguageProvider } from '../../../contexts/Localisation'
import { useDocumentModal } from '../../../utils/hooks/useDocumentModal/useDocumentModal'
import { DateTime } from 'luxon'
import getServerUrl from '../../../utils/helpers/endpoints/endpointUrlBuilder'
import { FileData, useDocumentFiles } from '../../../utils/hooks/useDocumentFiles'

const DocumentsTab: React.FC<{
  structure: FullStructure
}> = ({ structure: fullStructure }) => {
  const { t } = useLanguageProvider()

  const { docs, loading, error } = useDocumentFiles({
    applicationId: fullStructure.info.id,
    outputOnly: true,
  })

  if (error) return <p>{error}</p>
  if (loading) return <Loading />

  return docs ? (
    <Container id="documents-tab">
      <Header as="h3" className="center-text">
        {t('REVIEW_DOC_HEADER')}
      </Header>
      <div className="flex-column-center-start"></div>
      <List id="document-list" className="flex-row-space_evenly flex-extra">
        {docs.map((doc) => (
          <FileDisplay doc={doc} key={doc.uniqueId} />
        ))}
      </List>
    </Container>
  ) : null
}

const FileDisplay: React.FC<{ doc: FileData }> = ({ doc }) => {
  const { uniqueId, description, originalFilename, timestamp } = doc
  const fileUrl = getServerUrl('file', { fileId: uniqueId })
  const thumbnailUrl = getServerUrl('file', { fileId: uniqueId, thumbnail: true })

  const { DocumentModal, handleFile } = useDocumentModal({
    filename: originalFilename,
    fileUrl,
  })

  return (
    <>
      {DocumentModal}
      <List.Item className="clickable" onClick={handleFile}>
        <div className="flex-row-start flex-extra">
          <div className="icon-container">
            <Image src={thumbnailUrl} className="clickable" />
          </div>
          <div>
            <Header as="h4" content={description} />
            <p className="slightly-smaller-text">{DateTime.fromISO(timestamp).toLocaleString()}</p>
            <p className="clickable link-style smaller-text" onClick={handleFile}>
              {originalFilename}
            </p>
          </div>
        </div>
      </List.Item>
    </>
  )
}

export default DocumentsTab
