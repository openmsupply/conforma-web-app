import React, { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import { Icon, Modal, ModalContent, Input, Image } from 'semantic-ui-react'
import { useDebounceCallback } from '../useDebouncedCallback'
import { downloadFile } from '../../helpers/utilityFunctions'
import { useLanguageProvider } from '../../../contexts/Localisation'
import { useViewport } from '../../../contexts/ViewportState'
import { Loading } from '../../../components/common'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

interface DocumentProps {
  filename: string
  fileUrl: string
  open: boolean
  onClose: () => void
  fileType: 'pdf' | 'image' | 'other'
  preventDownload: boolean
  cachedFile?: File
}

const MAX_MODAL_WIDTH = 960

const DocumentModal: React.FC<DocumentProps> = ({
  filename,
  fileUrl,
  fileType,
  open,
  onClose,
  preventDownload,
  cachedFile,
}) => {
  const { t } = useLanguageProvider()
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageInput, setPageInput] = useState(1)
  const { viewport } = useViewport()
  const debouncePageNum = useDebounceCallback((val: number) => setCurrentPage(val), [], 150)

  const contentWidth = Math.min(viewport.width * 0.9, MAX_MODAL_WIDTH)
  const pdfWidth = contentWidth * 0.9

  const onDocumentLoadSuccess = ({ numPages }: any) => {
    setNumPages(numPages)
  }

  const handlePageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value)
    if (value > (numPages ?? 1) || value < 0) return
    setPageInput(value || 1) // 0 falls back to 1
    debouncePageNum(value || 1)
  }

  return (
    <Modal
      closeIcon
      open={open}
      onClose={onClose}
      style={{
        width: fileType === 'pdf' ? contentWidth : 'unset',
        marginLeft: 15,
        marginRight: 15,
      }}
      className="document-modal"
    >
      <Modal.Header>
        <div className="flex-row-space-between-center-wrap" style={{ width: '95%', gap: 10 }}>
          <span style={{ maxWidth: 500 }}>{filename}</span>
          <div className="flex-row-start-center" style={{ gap: 5 }}>
            {fileType === 'pdf' && numPages > 1 && (
              <div
                className="flex-row-start-center"
                style={{ gap: 10, fontSize: '1rem', fontWeight: 'normal', marginRight: 15 }}
              >
                <span className="slightly-smaller-text">{t('DOCUMENT_VIEW_PAGE_JUMP')}</span>
                <Input
                  size="small"
                  type="number"
                  min={1}
                  max={numPages}
                  value={pageInput}
                  onChange={handlePageChange}
                  onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
                  style={{ width: 75 }}
                />
                <span className="slightly-smaller-text">
                  {t('DOCUMENT_VIEW_TOTAL_PAGES', numPages)}
                </span>
              </div>
            )}
            {fileType !== 'other' && !preventDownload && (
              <>
                <a href={fileUrl} target="_blank">
                  <Icon className="clickable" name="external alternate" />
                </a>
                <Icon
                  className="clickable link-style"
                  name="download"
                  onClick={() => downloadFile(fileUrl, filename)}
                  style={{ height: 'inherit' }}
                />
              </>
            )}
          </div>
        </div>
      </Modal.Header>
      <ModalContent style={{ maxHeight: '80vh', overflow: 'auto' }}>
        {fileType === 'pdf' && (
          <Document
            file={cachedFile ?? fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<Loading />}
          >
            {Array.from(new Array(numPages), (_, index) => (
              <Page
                key={`page_${index + 1}`}
                inputRef={(ref) => {
                  if (ref && currentPage === index + 1) {
                    ref.scrollIntoView()
                  }
                }}
                pageNumber={index + 1}
                width={pdfWidth}
              />
            ))}
          </Document>
        )}
        {fileType === 'image' && (
          <div className="flex-row-center-center">
            <Image src={fileUrl} />
          </div>
        )}
        {fileType === 'other' && (
          <div className="flex-column-center-center" style={{ gap: 20 }}>
            <p>{t('DOCUMENT_VIEW_NO_PREVIEW')}</p>
            <Icon
              size="massive"
              className="clickable link-style"
              name="download"
              onClick={() => downloadFile(fileUrl, filename)}
            />
          </div>
        )}
      </ModalContent>
    </Modal>
  )
}

export default DocumentModal
