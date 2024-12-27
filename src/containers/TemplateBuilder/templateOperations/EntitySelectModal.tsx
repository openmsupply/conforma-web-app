import { useState } from 'react'
import {
  ModalHeader,
  ModalDescription,
  ModalContent,
  ModalActions,
  Button,
  Header,
  Modal,
  Checkbox,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Label,
  SemanticCOLORS,
} from 'semantic-ui-react'
import { ModalState } from './useTemplateOperations'
import { useOperationState } from '../shared/OperationContext'
import { ModifiedEntitiesToKeep, ModifiedEntitiesToKeepAPIInput } from './apiOperations'
import { JsonData, JsonEditor } from 'json-edit-react'

interface Entity {
  checksum: string
  lastModified: string // ISO Date
  data: Record<string, unknown>
}

export interface ComparisonObject {
  incoming: Entity
  current: Entity
}

export interface ModifiedEntities {
  filters: Record<string, ComparisonObject>
  permissions: Record<string, ComparisonObject>
  dataViews: Record<string, ComparisonObject>
  dataViewColumns: Record<string, ComparisonObject>
  category: Record<string, ComparisonObject>
  dataTables: Record<string, ComparisonObject>
  files: Record<string, ComparisonObject>
}

export const EntitySelectModal: React.FC<Omit<ModalState, 'type'>> = ({
  isOpen,
  modifiedEntities,
  uid = '',
  onConfirm,
  close,
}) => {
  const [preserveCurrentSelections, setPreserveCurrentSelections] =
    useState<ModifiedEntitiesToKeep>(getInitialSelections(modifiedEntities))

  const updateState = (
    key: keyof ModifiedEntitiesToKeep,
    value: string,
    operation: 'add' | 'remove' = 'add'
  ) =>
    setPreserveCurrentSelections((current) => {
      const newValues = new Set(current[key])
      if (operation === 'add') newValues.add(value)
      else newValues.delete(value)
      return { ...current, [key]: newValues }
    })

  return (
    <Modal open={isOpen}>
      <ModalHeader>Import Template</ModalHeader>
      <ModalContent>
        <ModalDescription>
          <p>
            The following entities connected to this template are already in the system, but are
            different from what you are about to import.
          </p>
          <p>
            Please review them carefully and select the one you wish to keep. If you select the{' '}
            <strong>import</strong> entity, the current system one will be overwritten. However, if
            the <strong>current system</strong> entity is selected, the template may not behave
            exactly as expected.
          </p>
          <p>
            By default, the <em>newest</em> version of each is selected.
          </p>
        </ModalDescription>
        <Table stackable className="import-table">
          <TableBody>
            {Object.keys(modifiedEntities?.category ?? {}).length > 0 && (
              <EntityGroup
                title="Category"
                group="category"
                modified={modifiedEntities?.category ?? {}}
                currentlySelected={new Set(preserveCurrentSelections.category)}
                updateState={updateState}
                color="blue"
                uid={uid}
              />
            )}
            {Object.keys(modifiedEntities?.dataViews ?? {}).length > 0 && (
              <EntityGroup
                title="Data Views"
                group="dataViews"
                modified={modifiedEntities?.dataViews ?? {}}
                currentlySelected={preserveCurrentSelections.dataViews}
                updateState={updateState}
                color="orange"
                uid={uid}
              />
            )}
            {Object.keys(modifiedEntities?.dataViewColumns ?? {}).length > 0 && (
              <EntityGroup
                title="Data View Columns"
                group="dataViewColumns"
                modified={modifiedEntities?.dataViewColumns ?? {}}
                currentlySelected={preserveCurrentSelections.dataViewColumns}
                updateState={updateState}
                color="pink"
                uid={uid}
              />
            )}
            {Object.keys(modifiedEntities?.filters ?? {}).length > 0 && (
              <EntityGroup
                title="Filters"
                group="filters"
                modified={modifiedEntities?.filters ?? {}}
                currentlySelected={preserveCurrentSelections.filters}
                updateState={updateState}
                color="green"
                uid={uid}
              />
            )}
            {Object.keys(modifiedEntities?.permissions ?? {}).length > 0 && (
              <EntityGroup
                title="Permissions"
                group="permissions"
                modified={modifiedEntities?.permissions ?? {}}
                currentlySelected={preserveCurrentSelections.permissions}
                updateState={updateState}
                color="teal"
                uid={uid}
              />
            )}
            {Object.keys(modifiedEntities?.dataTables ?? {}).length > 0 && (
              <EntityGroup
                title="Data Tables"
                group="dataTables"
                modified={modifiedEntities?.dataTables ?? {}}
                currentlySelected={preserveCurrentSelections.dataTables}
                updateState={updateState}
                color="yellow"
                uid={uid}
              />
            )}
            {Object.keys(modifiedEntities?.files ?? {}).length > 0 && (
              <EntityGroup
                title="Files"
                group="files"
                modified={modifiedEntities?.files ?? {}}
                currentlySelected={preserveCurrentSelections.files}
                updateState={updateState}
                color="purple"
                uid={uid}
              />
            )}
            {/* WHAT ABOUT FILES??? */}
          </TableBody>
        </Table>
      </ModalContent>
      <ModalActions>
        <Button onClick={close} content="Cancel" />
        <Button
          onClick={() => onConfirm(prepareForImport(preserveCurrentSelections))}
          primary
          content="Install"
        />
      </ModalActions>
    </Modal>
  )
}

interface GroupProps {
  title: string
  group: keyof ModifiedEntitiesToKeep
  modified: Record<string, ComparisonObject>
  currentlySelected: Set<string>
  updateState: (
    key: keyof ModifiedEntitiesToKeep,
    value: string,
    operation?: 'add' | 'remove'
  ) => void
  color: SemanticCOLORS
  uid: string
}
const EntityGroup: React.FC<GroupProps> = ({
  title,
  group,
  modified,
  currentlySelected,
  updateState,
  color,
  uid,
}) => {
  return (
    <>
      <TableRow className="import-section-header-row">
        <TableCell colspan={2}>
          <Header as="h3">{title}</Header>
        </TableCell>
      </TableRow>
      {Object.entries(modified).map(([key, value]) => (
        <EntitySelect
          key={key}
          title={key}
          entity={value}
          currentlySelected={currentlySelected.has(key) ? 'current' : 'incoming'}
          updateState={(item, operation) => updateState(group, item, operation)}
          labelColor={color}
          uid={uid}
          group={group}
        />
      ))}
    </>
  )
}

type SelectionOption = 'incoming' | 'current'

interface EntityProps {
  group: keyof ModifiedEntities
  title: string
  entity: ComparisonObject
  currentlySelected: SelectionOption
  updateState: (value: string, operation?: 'add' | 'remove') => void
  labelColor: SemanticCOLORS
  uid: string
}
const EntitySelect: React.FC<EntityProps> = ({
  group,
  title,
  entity,
  currentlySelected,
  updateState,
  labelColor,
  uid,
}) => {
  const { getFullEntityDiff } = useOperationState()
  const { incoming, current } = entity
  const [showFull, setShowFull] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fullData, setFullData] = useState<{
    incoming: Record<string, unknown>
    current: Record<string, unknown>
  }>()
  const currentIsNewer =
    new Date(entity.current.lastModified) > new Date(entity.incoming.lastModified)

  const handleClick = async () => {
    if (showFull) {
      setShowFull(false)
      return
    }
    if (fullData) {
      setShowFull(true)
      return
    }

    setLoading(true)
    const result = await getFullEntityDiff(uid, group, title)
    setFullData(result)
    setShowFull(true)
    setLoading(false)
  }

  return (
    <>
      <TableRow className="import-row import-entity-row">
        <TableCell className="import-cell import-incoming" verticalAlign="top">
          <Label color={labelColor}>{title}</Label>
          <p>
            Last modified: <strong>{new Date(incoming.lastModified).toLocaleString()}</strong>
          </p>
          <JsonViewer
            data={showFull ? fullData?.incoming ?? incoming.data : incoming.data}
            title="incoming"
            newest={!currentIsNewer}
          />
        </TableCell>
        <TableCell
          className="import-cell import-current"
          verticalAlign="top"
          style={{ backgroundColor: '#FCFFF5 !important' }}
        >
          <Label color="yellow" style={{ visibility: 'hidden' }}>
            {title}
          </Label>
          <Button
            floated="right"
            primary
            inverted
            loading={loading}
            size="mini"
            content={showFull && fullData ? 'Show differences' : 'Show full data'}
            onClick={handleClick}
          />
          <p>
            Last modified: <strong>{new Date(current.lastModified).toLocaleString()}</strong>
          </p>
          <JsonViewer
            data={showFull ? fullData?.current ?? current.data : current.data}
            title="current"
            newest={currentIsNewer}
          />
        </TableCell>
      </TableRow>
      <TableRow className="import-row import-select-row">
        <TableCell>
          <div className="flex-row-start-center" style={{ gap: 10 }}>
            <p>Use this version</p>
            <Checkbox
              checked={currentlySelected === 'incoming'}
              onChange={() => updateState(title, 'remove')}
            />
          </div>
        </TableCell>
        <TableCell>
          <div className="flex-row-start-center" style={{ gap: 10 }}>
            <p>Keep this version</p>
            <Checkbox
              checked={currentlySelected === 'current'}
              onChange={() => updateState(title)}
            />
          </div>
        </TableCell>
      </TableRow>
    </>
  )
}

const JsonViewer = ({
  data,
  title,
  newest,
}: {
  data: JsonData
  title: string
  newest: boolean
}) => (
  <JsonEditor
    rootName={title}
    rootFontSize={12}
    data={data}
    restrictAdd={true}
    restrictDelete={true}
    restrictEdit={true}
    maxWidth="100%"
    collapse={1}
    showCollectionCount="when-closed"
    indent={1}
    theme={{ container: { backgroundColor: newest ? 'rgb(236, 248, 233)' : '#fff4f4' } }}
  />
)

const getInitialSelections = (entities?: ModifiedEntities) => {
  const initialValues: ModifiedEntitiesToKeep = {
    filters: new Set<string>(),
    permissions: new Set<string>(),
    dataViews: new Set<string>(),
    dataViewColumns: new Set<string>(),
    category: new Set<string>(),
    dataTables: new Set<string>(),
    files: new Set<string>(),
  }
  if (!entities) return initialValues
  for (const [key, entitiesOfOneType] of Object.entries(entities)) {
    if (!entitiesOfOneType) continue
    Object.entries(entitiesOfOneType as Record<string, ComparisonObject>).forEach(
      ([code, comparison]) => {
        if (new Date(comparison.current.lastModified) > new Date(comparison.incoming.lastModified))
          initialValues[key as keyof Omit<ModifiedEntities, 'category'>]?.add(code)
      }
    )
  }
  return initialValues
}

const prepareForImport = (
  preserveCurrent: ModifiedEntitiesToKeep
): ModifiedEntitiesToKeepAPIInput =>
  Object.entries(preserveCurrent).reduce((acc, [key, values]) => {
    const valuesAsArray = Array.from(values)
    if (key === 'category' && valuesAsArray.length > 0)
      return { ...acc, category: valuesAsArray[0] }
    if (valuesAsArray.length > 0) return { ...acc, [key]: valuesAsArray }
    return acc
  }, {})
