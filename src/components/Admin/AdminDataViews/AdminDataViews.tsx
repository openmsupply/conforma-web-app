import React, { Suspense, useState } from 'react'
import { useRouter } from '../../../utils/hooks/useRouter'
import {
  Header,
  Button,
  Dropdown,
  Checkbox,
  Icon,
  DropdownItemProps,
  DropdownProps,
} from 'semantic-ui-react'
import { TranslateMethod, useLanguageProvider } from '../../../contexts/Localisation'
import usePageTitle from '../../../utils/hooks/usePageTitle'
import useConfirmationModal from '../../../utils/hooks/useConfirmationModal'
import {
  DataTable,
  DataView,
  DataViewColumnDefinition,
  GetDataTablesQuery,
  useGetDataTablesQuery,
} from '../../../utils/generated/graphql'
import { camelCase, pickBy, startCase } from 'lodash-es'
import { nanoid } from 'nanoid'
import { useAdminDataViewConfig } from './useAdminDataViewConfig'
import config from '../../../config'
import { JsonData } from 'json-edit-react'
import { Loading } from '../../common'

const JsonEditor = React.lazy(() => import('../JsonEditor/JsonEditor'))

export const AdminDataViews: React.FC = () => {
  const { t } = useLanguageProvider()
  usePageTitle(t('PAGE_TITLE_DATA_VIEW'))
  const [includeLookupTables, setIncludeLookupTables] = useState(false)
  const [additional, setAdditional] = useState<string | undefined>()

  const { query, updateQuery, setQuery } = useRouter()

  const { data, loading } = useGetDataTablesQuery({ fetchPolicy: 'cache-and-network' })

  const selectedTable = query.selectedTable
  const isLookupTable =
    data?.dataTables?.nodes.find((table) => camelCase(table?.tableName ?? '') === selectedTable)
      ?.isLookupTable ?? false

  return (
    <div id="data-view-config-panel" className="flex-column" style={{ gap: 15 }}>
      <div className="flex-row-space-between-center">
        <Header>{t('DATA_VIEW_CONFIG_HEADER')}</Header>
        <p className="slightly-smaller-text">
          <a
            href="https://github.com/msupply-foundation/conforma-server/wiki/Data-View"
            target="_blank"
          >
            Docs <Icon name="external" />
          </a>
        </p>
      </div>
      <div className="flex-row-space-between-center">
        <Dropdown
          selection
          clearable
          search
          allowAdditions
          placeholder={t('DATA_VIEW_CONFIG_SELECT_TABLE')}
          loading={loading}
          value={selectedTable}
          options={getDataTableOptions(data, includeLookupTables, additional, t)}
          onAddItem={(_, { value }) => setAdditional(value as string)}
          onChange={(_, { value }) => {
            if (!value) setQuery({})
            else updateQuery({ selectedTable: value })
          }}
          style={{ minWidth: 300 }}
        />
        <Checkbox
          checked={includeLookupTables}
          onChange={() => setIncludeLookupTables(!includeLookupTables)}
          label={t('DATA_VIEW_CONFIG_INCLUDE_LOOKUP')}
        />
      </div>
      {selectedTable && (
        <>
          <DataViewEditor tableName={selectedTable} isLookupTable={isLookupTable} />
          <ColumnDefinitionEditor tableName={selectedTable} />
        </>
      )}
    </div>
  )
}

interface DataViewEditorProps {
  tableName: string
  isLookupTable: boolean
}

const DataViewEditor: React.FC<DataViewEditorProps> = ({ tableName, isLookupTable }) => {
  const { t } = useLanguageProvider()
  const { updateQuery } = useRouter()
  const { ConfirmModal, showModal: showConfirmation } = useConfirmationModal({
    type: 'warning',
    confirmText: t('BUTTON_CONFIRM'),
  })

  const {
    selectedDataView,
    dataViews,
    dataViewObject,
    loading,
    updateDataView,
    deleteDataView,
    addDataView,
    isSaving,
    isDeleting,
    isAdding,
  } = useAdminDataViewConfig(tableName)

  return (
    <>
      <ConfirmModal />
      <DataViewDisplay
        title={t('PAGE_TITLE_DATA_VIEW')}
        placeholder={t('DATA_VIEW_CONFIG_SELECT_VIEW')}
        loading={loading}
        dropdownValue={selectedDataView}
        options={getDataViewOptions(dataViews)}
        onChange={(_, { value }) => {
          if (dataViews) updateQuery({ dataView: value })
        }}
        data={
          dataViewObject
            ? pickBy(
                dataViewObject,
                (_, key) =>
                  !['__typename', 'id']
                    // These two properties shouldn't show up in the editor,
                    // as we don't want them being touched
                    .includes(key)
              )
            : undefined
        }
        dataName={dataViewObject?.identifier as string}
        onSave={(data) => {
          showConfirmation({
            title: t('DATA_VIEW_CONFIG_SAVE_WARNING'),
            message: t('DATA_VIEW_CONFIG_SAVE_MESSAGE'),
            onConfirm: () =>
              updateDataView({
                variables: { id: dataViewObject?.id as number, patch: data as object },
              }),
            awaitAction: false,
          })
        }}
        isSaving={isSaving}
        onDelete={() =>
          showConfirmation({
            title: t('DATA_VIEW_CONFIG_DELETE_WARNING'),
            message: t('DATA_VIEW_CONFIG_DELETE_MESSAGE'),
            onConfirm: () => deleteDataView({ variables: { id: dataViewObject?.id as number } }),
            awaitAction: false,
          })
        }
        isDeleting={isDeleting}
        onAdd={() => {
          addDataView({
            variables: {
              identifier: `${tableName}_${nanoid(8)}`,
              tableName,
              code: '__CODE__',
              detailViewHeaderColumn: '__HEADER_COL__',
              menuName: !isLookupTable ? startCase(tableName) : null,
            },
          })
        }}
        isAdding={isAdding}
        isLookupTable={isLookupTable}
      />
    </>
  )
}

const ColumnDefinitionEditor: React.FC<{ tableName: string }> = ({ tableName }) => {
  const { t } = useLanguageProvider()
  const { updateQuery } = useRouter()
  const { ConfirmModal, showModal: showConfirmation } = useConfirmationModal({
    type: 'warning',
    confirmText: t('BUTTON_CONFIRM'),
  })

  const {
    selectedColumn,
    columnDefinitions,
    columnDefinitionObject,
    columnsLoading,
    updateColumnDefinition,
    deleteColumnDefinition,
    addColumnDefinition,
    isSavingColumn,
    isDeletingColumn,
    isAddingColumn,
  } = useAdminDataViewConfig(tableName)

  return (
    <>
      <ConfirmModal />
      <DataViewDisplay
        title={t('DATA_VIEW_COLUMN_DEFINITIONS')}
        placeholder={t('DATA_VIEW_CONFIG_SELECT_COLUMN')}
        loading={columnsLoading}
        dropdownValue={selectedColumn}
        options={getColumnDefinitionOptions(columnDefinitions)}
        onChange={(_, { value }) => {
          if (columnDefinitions) updateQuery({ columnDefinition: value })
        }}
        data={
          columnDefinitionObject
            ? pickBy(
                columnDefinitionObject,
                (_, key) =>
                  !['__typename', 'id']
                    // These two properties shouldn't show up in the editor,
                    // as we don't want them being touched
                    .includes(key)
              )
            : undefined
        }
        dataName={columnDefinitionObject?.columnName as string}
        onSave={(data) => {
          showConfirmation({
            title: t('DATA_VIEW_CONFIG_SAVE_COL_WARNING'),
            message: t('DATA_VIEW_CONFIG_SAVE_COL_MESSAGE'),
            onConfirm: () =>
              updateColumnDefinition({
                variables: { id: columnDefinitionObject?.id as number, patch: data as object },
              }),
          })
        }}
        isSaving={isSavingColumn}
        onDelete={() =>
          showConfirmation({
            title: t('DATA_VIEW_CONFIG_DELETE_COL_WARNING'),
            message: t('DATA_VIEW_CONFIG_DELETE_COL_MESSAGE'),
            onConfirm: () =>
              deleteColumnDefinition({ variables: { id: columnDefinitionObject?.id as number } }),
          })
        }
        isDeleting={isDeletingColumn}
        onAdd={() => {
          addColumnDefinition({
            variables: {
              columnName: `${tableName}_column_${nanoid(8)}`,
              tableName,
            },
          })
        }}
        isAdding={isAddingColumn}
      />
    </>
  )
}

interface DataViewDisplayProps {
  title: string
  placeholder: string
  loading: boolean
  dropdownValue: string
  options: DropdownItemProps[]
  onChange: (_: unknown, value: DropdownProps) => void
  data: object | undefined
  dataName: string
  onSave: (data: JsonData) => void
  isSaving: boolean
  onDelete: () => void
  isDeleting: boolean
  onAdd: () => void
  isAdding: boolean
  isLookupTable?: boolean
}

const DataViewDisplay: React.FC<DataViewDisplayProps> = ({
  title,
  placeholder,
  loading,
  dropdownValue,
  options,
  onChange,
  data,
  dataName,
  onSave,
  isSaving,
  onDelete,
  isDeleting,
  onAdd,
  isAdding,
}) => {
  const { t } = useLanguageProvider()
  const { ConfirmModal } = useConfirmationModal({
    type: 'warning',
    confirmText: t('BUTTON_CONFIRM'),
  })

  return (
    <div>
      <Header as="h2">{title}</Header>
      <ConfirmModal />
      <div className="flex-row-space-between">
        <Dropdown
          selection
          clearable
          placeholder={placeholder}
          loading={loading}
          value={dropdownValue}
          options={options}
          onChange={onChange}
          style={{ minWidth: 300 }}
        />
        <div>
          <Button
            primary
            inverted
            disabled={!data}
            loading={isDeleting}
            icon={<Icon name="trash alternate outline" size="small" />}
            content={t('DATA_VIEW_CONFIG_DELETE_BUTTON')}
            onClick={onDelete}
          />
          <Button
            primary
            inverted
            loading={isAdding}
            icon={<Icon name="plus" size="tiny" color="blue" />}
            content={t('DATA_VIEW_CONFIG_ADD_BUTTON')}
            onClick={onAdd}
          />
        </div>
      </div>
      {data && (
        <Suspense fallback={<Loading />}>
          <JsonEditor
            data={data}
            onSave={onSave}
            isSaving={isSaving}
            rootName={dataName}
            collapse={1}
            showArrayIndices={false}
            maxWidth={650}
            restrictAdd={({ level }) => level === 0}
            restrictDelete={({ level }) => level === 1}
          />
        </Suspense>
      )}
    </div>
  )
}

const getDataTableOptions = (
  data: GetDataTablesQuery | undefined,
  includeLookupTables: boolean,
  additional: string | undefined,
  t: TranslateMethod
) => {
  if (!data) return []

  const options = (data.dataTables?.nodes as DataTable[])
    .filter(({ isLookupTable }) => (includeLookupTables ? true : !isLookupTable))
    .map(({ id, tableName, isLookupTable }) => {
      const table = camelCase(tableName)
      return {
        key: `${table}_${id}`,
        text: `${table}${isLookupTable ? ` (${t('LOOKUP_TABLE_TITLE')})` : ''}`,
        value: table,
      }
    })

  // Include the "core" system tables that can be accessed
  options.push(
    ...config.dataViewAllowedTableNames.map((table) => ({
      key: `${table}`,
      text: table,
      value: table,
    }))
  )

  // We also want to include dataViews that have been created, but don't have an
  // actual table in the system yet
  const allDataTables =
    data.dataTables?.nodes.map(({ tableName }: any) => camelCase(tableName)) ?? []
  const optionTableNames = options.map(({ value }) => value)
  const additionalDataViews = new Set(
    (data.dataViews?.nodes as { tableName: string }[])
      .map(({ tableName }) => camelCase(tableName))
      .filter((table) => !allDataTables.includes(table) && !optionTableNames.includes(table))
  )

  options.push(
    ...Array.from(additionalDataViews).map((table) => ({ key: table, text: table, value: table }))
  )

  // Include custom-added option
  if (additional) options.push({ key: additional, text: additional, value: additional })

  return options
}

const getDataViewOptions = (dataViews: DataView[] | undefined) => {
  if (!dataViews) return []

  return dataViews.map((dataView) => {
    const { id, identifier, code } = dataView
    return {
      key: `${code}_${id}`,
      text: identifier,
      value: identifier,
      data: dataView,
    }
  })
}

const getColumnDefinitionOptions = (columnDefinitions: DataViewColumnDefinition[] | undefined) => {
  if (!columnDefinitions) return []

  return columnDefinitions.map((colDef) => {
    const { id, columnName, title } = colDef
    return {
      key: `${columnName}_${id}`,
      text: title ? `${title} (${columnName})` : columnName,
      value: columnName,
      data: colDef,
    }
  })
}
