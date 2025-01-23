import { useState } from 'react'
import { Confirm, Dropdown, Input, List, ListItem } from 'semantic-ui-react'
import { ModalState } from './useTemplateOperations'
import { EntitySelectModal } from './EntitySelectModal'

export const TemplateOperationsModal: React.FC<ModalState> = ({ type, ...props }) => {
  switch (type) {
    case 'unlinkedDataViewWarning':
      return <DataViewWarning {...props} />
    case 'commit':
    case 'exportCommit':
      return <CommitConfirm type={type} {...props} />
    case 'exportWarning':
      return <ExportWarning {...props} />
    case 'duplicate':
      return <DuplicateModal {...props} />
    case 'import':
      return <EntitySelectModal {...props} />
    default:
      return null
  }
}

const DataViewWarning: React.FC<Omit<ModalState, 'type'>> = ({
  isOpen,
  onConfirm,
  close,
  unconnectedDataViews = [],
}) => {
  return (
    <Confirm
      open={isOpen}
      // Prevent click in Input from closing modal
      onClick={(e: any) => e.stopPropagation()}
      content={
        <div style={{ padding: 10, gap: 10 }} className="flex-column">
          <h2>Warning</h2>
          <p>
            The following Data Views are used by this template but haven't been properly linked, so
            won't be exported with the template.
          </p>
          <List bulleted>
            {unconnectedDataViews.map((view) => (
              <ListItem key={view.identifier}>{view.code}</ListItem>
            ))}
          </List>
          <p>Are you sure you want to proceed?</p>
        </div>
      }
      confirmButton="I understand, commit anyway"
      cancelButton="Let me fix it"
      onCancel={close}
      onConfirm={onConfirm}
    />
  )
}

export const CommitConfirm: React.FC<
  Omit<ModalState, 'type'> & { type: 'commit' | 'exportCommit' }
> = ({ type, isOpen, onConfirm, close }) => {
  const [comment, setComment] = useState('')
  const [commitError, setCommitError] = useState(false)

  const headerText = type === 'commit' ? 'Commit version?' : 'Commit and export template?'
  const mainText =
    type === 'commit'
      ? 'This will create a permanent template version that can no longer be modified. To make any further changes, you will need to duplicate it and create a new version.'
      : 'By exporting this template now, you will be committing the current version. To make any further changes, you will need to duplicate it and start a new template version.'

  return (
    <Confirm
      open={isOpen}
      // Prevent click in Input from closing modal
      onClick={(e: any) => e.stopPropagation()}
      content={
        <div style={{ padding: 10, gap: 10 }} className="flex-column">
          <h2>{headerText}</h2>
          <p>{mainText}</p>
          <div className="flex-row-start-center" style={{ gap: 10 }}>
            <label>Please provide a commit message:</label>
            <Input
              value={comment}
              onChange={(e) => {
                setCommitError(false)
                setComment(e.target.value)
              }}
              style={{ width: '60%' }}
              error={commitError}
            />
          </div>
        </div>
      }
      onCancel={close}
      onConfirm={() => {
        if (comment !== '') onConfirm(comment)
        else setCommitError(true)
      }}
    />
  )
}

export const DuplicateModal: React.FC<Omit<ModalState, 'type'>> = ({
  isOpen,
  onConfirm,
  close,
  currentIsCommitted,
}) => {
  const [selectedType, setSelectedType] = useState<'version' | 'template'>('version')
  const [newCode, setNewCode] = useState('')
  const [codeError, setCodeError] = useState(false)
  const [commitMessage, setCommitMessage] = useState('')
  const [commitError, setCommitError] = useState(false)

  const requiresCommit = !currentIsCommitted && selectedType === 'version'
  return (
    <Confirm
      open={isOpen}
      // Prevent click in Input from closing modal
      onClick={(e: any) => e.stopPropagation()}
      content={
        <div style={{ padding: 10, gap: 5 }} className="flex-column">
          <h2>Duplicate template</h2>
          <p>
            Do you want to create a new template version or a whole new template type based on this
            template?
          </p>
          <p>(New template will start with an empty version history)</p>
          <Dropdown
            selection
            options={[
              { key: 'version', value: 'version', text: 'Version' },
              { key: 'template', value: 'template', text: 'Template' },
            ]}
            value={selectedType}
            onChange={(_, { value }) => setSelectedType(value as 'version' | 'template')}
          />
          {selectedType === 'template' && (
            <div className="flex-row-start-center" style={{ gap: 10 }}>
              <label>New template code:</label>
              <Input
                value={newCode}
                onChange={(e) => {
                  setCodeError(false)
                  setNewCode(e.target.value)
                }}
                error={codeError}
              />
            </div>
          )}
          {requiresCommit && (
            <div className="flex-column-start" style={{ gap: 0, marginTop: 10 }}>
              <p>
                <em>
                  Creating a new version of this template requires this version be committed, which
                  means it can no longer have changes made to it.
                </em>
              </p>
              <div className="flex-row-start-center" style={{ gap: 10 }}>
                <label>Commit message:</label>
                <Input
                  value={commitMessage}
                  onChange={(e) => {
                    setCommitError(false)
                    setCommitMessage(e.target.value)
                  }}
                  style={{ width: '80%' }}
                  error={commitError}
                />
              </div>
            </div>
          )}
        </div>
      }
      onCancel={close}
      onConfirm={async () => {
        if (selectedType === 'template' && newCode === '') {
          setCodeError(true)
          return
        }
        if (requiresCommit && commitMessage === '') {
          setCommitError(true)
          return
        }

        onConfirm({
          newCode: selectedType === 'template' ? newCode : undefined,
          comment: requiresCommit ? commitMessage : undefined,
        })
      }}
    />
  )
}

const ExportWarning: React.FC<Omit<ModalState, 'type'>> = ({ isOpen, onConfirm, close }) => {
  return (
    <Confirm
      open={isOpen}
      // Prevent click in Input from closing modal
      onClick={(e: any) => e.stopPropagation()}
      content={
        <div style={{ padding: 10, gap: 10 }} className="flex-column">
          <h2>Warning</h2>
          <p>
            This template currently exports data for some linked items (e.g. DataViews, Filters,
            Permissions) that have changed since this template was committed, You may wish to make a
            new version of this template and export that to ensure that it includes the current
            state of the system.
          </p>
        </div>
      }
      confirmButton="That's okay, export anyway"
      cancelButton="Let me make a new version"
      onCancel={close}
      onConfirm={onConfirm}
    />
  )
}
