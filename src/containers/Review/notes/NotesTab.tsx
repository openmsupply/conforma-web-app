import React from 'react'
import {
  Button,
  Checkbox,
  Container,
  Dropdown,
  Icon,
  Image,
  Form,
  Message,
} from 'semantic-ui-react'
import { Loading } from '../../../components/common'
import { ApplicationNote, useGetApplicationNotesQuery } from '../../../utils/generated/graphql'
import useConfirmationModal from '../../../utils/hooks/useConfirmationModal'
import { useUserState } from '../../../contexts/UserState'
import { FullStructure } from '../../../utils/types'
import { useLanguageProvider } from '../../../contexts/Localisation'
import { DateTime, Interval } from 'luxon'
import Markdown from '../../../utils/helpers/semanticReactMarkdown'
import NewCommentForm from './NewCommentForm'
import useNotesMutations from '../../../utils/hooks/useNotesMutations'
import getServerUrl from '../../../utils/helpers/endpoints/endpointUrlBuilder'
import { useSimpleCache } from '../../../utils/hooks/useSimpleCache'
import { useDocumentModal } from '../../../utils/hooks/useDocumentModal/useDocumentModal'

const COMMENT_DELETION_LIMIT = 5 // minutes

interface FileData {
  filePath: string
  description: string | null
  id: number
  originalFilename: string
  uniqueId: string
}

export interface NotesState {
  sortDesc: boolean
  filesOnlyFilter: boolean
  showForm: boolean
  files: File[]
  comment: string
}

const NotesTab: React.FC<{
  structure: FullStructure
  state: NotesState
  setState: (state: NotesState) => void
}> = ({ structure: fullStructure, state, setState }) => {
  const {
    t,
    selectedLanguage: { locale },
  } = useLanguageProvider()
  const {
    userState: { currentUser },
  } = useUserState()
  const { ConfirmModal, showModal } = useConfirmationModal({
    type: 'warning',
    title: t('REVIEW_NOTES_DELETE_TITLE'),
    message: t('REVIEW_NOTES_DELETE_MESSAGE'),
    confirmText: t('BUTTON_CONFIRM'),
  })

  const { data, loading, error, refetch } = useGetApplicationNotesQuery({
    variables: { applicationId: fullStructure.info.id },
    // fetchPolicy: 'network-only',
  })
  const { deleteNote, error: noteMutationError } = useNotesMutations(fullStructure.info.id, refetch)

  // FileCache is to store the actual file contents after uploading, so when the
  // user previews it immediately after, they don't have to wait for it to
  // re-download
  const fileCache = useSimpleCache<File>()

  const { sortDesc, filesOnlyFilter, showForm } = state

  const handleDelete = async (noteId: number) => {
    const note = notes.find((n) => n.id === noteId)
    const noteFiles = note?.files.nodes
    if (noteFiles) {
      noteFiles.forEach((file) => fileCache.removeFromCache(file?.originalFilename ?? ''))
    }
    await deleteNote(noteId)
    refetch()
  }

  if (error) return <p>{error.message}</p>
  if (loading) return <Loading />

  const notes: ApplicationNote[] = sortAndFilter(
    data?.applicationNotes?.nodes as ApplicationNote[],
    sortDesc,
    filesOnlyFilter
  )

  return notes ? (
    <Container id="notes-tab">
      <ConfirmModal />
      <div className="options-row">
        <p>{t('REVIEW_NOTES_SORT_ORDER')}</p>
        <Dropdown
          selection
          options={[
            { key: 'newest', text: t('REVIEW_NOTES_NEWEST_FIRST'), value: true },
            { key: 'oldest', text: t('REVIEW_NOTES_OLDEST_FIRST'), value: false },
          ]}
          value={sortDesc}
          onChange={(_, { value }) => setState({ ...state, sortDesc: value as boolean })}
        />
        <p>{t('REVIEW_NOTES_FILES_ONLY')}</p>
        <Checkbox
          toggle
          checked={filesOnlyFilter}
          onChange={(_, { checked }) => setState({ ...state, filesOnlyFilter: checked as boolean })}
        />
      </div>
      {noteMutationError && <Message error content={noteMutationError} />}
      <div className="wrapper">
        {notes.length > 0 ? (
          notes.map((note) => {
            const isCurrentUser = note?.user?.id === currentUser?.userId
            return (
              <div
                key={note.id}
                className={`note-container item-container${
                  isCurrentUser ? ' highlight-background' : ''
                }`}
              >
                <div className="note-comment-row">
                  <div className="comment">
                    <Markdown text={note.comment} />
                  </div>
                  <Icon
                    className="clickable"
                    name="delete"
                    size="large"
                    color="blue"
                    onClick={() => showModal({ onConfirm: () => handleDelete(note.id) })}
                    style={{
                      visibility: isCurrentUser && canDelete(note.timestamp) ? 'visible' : 'hidden',
                    }}
                  />
                </div>
                <div className="file-row">
                  {note.files.nodes.map((file) => (
                    <FileDisplay
                      file={file as FileData}
                      cachedFile={fileCache.getFromCache(file?.uniqueId ?? '')}
                      key={file?.uniqueId}
                    />
                  ))}
                </div>
                <div className="note-footer-row">
                  <p className="tiny-bit-smaller-text">
                    <strong>{note.user?.fullName}</strong>
                  </p>
                  <p className="slightly-smaller-text dark-grey">
                    {DateTime.fromISO(note.timestamp)
                      .setLocale(locale)
                      .toLocaleString(DateTime.DATE_FULL)}
                  </p>
                </div>
              </div>
            )
          })
        ) : (
          <Message header={t('REVIEW_NOTES_NO_NOTES')} />
        )}
        {!showForm && (
          <div className="item-container">
            <Form.Field>
              <Button
                primary
                inverted
                className="wide-button"
                onClick={() => setState({ ...state, showForm: true })}
              >
                <Icon name="plus" size="tiny" color="blue" />
                {t('REVIEW_NOTES_NEW_NOTE')}
              </Button>
            </Form.Field>
          </div>
        )}
      </div>
      {showForm && (
        <NewCommentForm
          structure={fullStructure}
          state={state}
          setState={setState}
          refetchNotes={refetch}
          fileCache={fileCache}
        />
      )}
    </Container>
  ) : null
}

export default NotesTab

const FileDisplay: React.FC<{
  file: FileData
  cachedFile?: File
}> = ({ file, cachedFile }) => {
  const { uniqueId, originalFilename } = file
  const fileUrl = getServerUrl('file', { fileId: uniqueId })
  const thumbnailUrl = getServerUrl('file', { fileId: uniqueId, thumbnail: true })

  const { DocumentModal, handleFile } = useDocumentModal({
    filename: originalFilename,
    fileUrl,
    cachedFile,
  })

  return (
    <div className="file-container" key={file.uniqueId}>
      {DocumentModal}
      <Image src={thumbnailUrl} className="clickable" onClick={handleFile} />
      <p
        style={{ wordBreak: 'break-word' }}
        className="clickable link-style tiny-bit-smaller-text"
        onClick={handleFile}
      >
        {file.originalFilename}
      </p>
    </div>
  )
}

const sortAndFilter = (
  notes: ApplicationNote[],
  sortDesc: boolean,
  filesOnly: boolean
): ApplicationNote[] => {
  const sort = sortDesc ? (e: ApplicationNote[]) => e : (e: ApplicationNote[]) => [...e].reverse()
  const fileFilter = filesOnly
    ? (e: ApplicationNote[]) => e.filter((note) => note.files.nodes.length > 0)
    : (e: ApplicationNote[]) => e
  return fileFilter(sort(notes))
}

const canDelete = (timestamp: string): boolean => {
  // This is pretty insecure -- all someone needs to do is change their local
  // time on their computer and they can delete whatever they want!
  return (
    Interval.fromDateTimes(DateTime.fromISO(timestamp), DateTime.now()).length('minutes') <
    COMMENT_DELETION_LIMIT
  )
}
