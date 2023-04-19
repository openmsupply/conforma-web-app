import React, { useEffect, useState } from 'react'
import { Header, Table, Message, Search } from 'semantic-ui-react'
import { Loading } from '../../components'
import { useLanguageProvider } from '../../contexts/Localisation'
import usePageTitle from '../../utils/hooks/usePageTitle'
import { useRouter } from '../../utils/hooks/useRouter'
import { useDataViewsTable, useDataViewFilterDefinitions } from '../../utils/hooks/useDataViews'
import {
  HeaderRow,
  DataViewTableAPIQueries,
  DataViewsTableResponse,
  BasicStringObject,
  GqlFilterObject,
} from '../../utils/types'
import Markdown from '../../utils/helpers/semanticReactMarkdown'
import { constructElement, formatCellText } from './helpers'
import PaginationBar from '../../components/List/Pagination'
import buildQueryFilters from '../../utils/helpers/list/buildQueryFilters'
import useDebounce from '../../formElementPlugins/search/src/useDebounce'
import { useToast } from '../../contexts/Toast'
import ListFilters from '../List/ListFilters/ListFilters'
import { usePrefs } from '../../contexts/SystemPrefs'

export type SortColumn = {
  title: string
  ascending: boolean
} | null

const DataViewTable: React.FC<{ codeFromLookupTable?: string }> = ({ codeFromLookupTable }) => {
  const { strings } = useLanguageProvider()
  const { preferences } = usePrefs()
  const {
    query,
    location,
    updateQuery,
    params: { dataViewCode = codeFromLookupTable },
  } = useRouter()

  const [searchText, setSearchText] = useState(query.search)
  const [debounceOutput, setDebounceInput] = useDebounce(searchText)
  const { filterDefinitions, loading: filtersLoading } = useDataViewFilterDefinitions(dataViewCode)
  const [apiQueries, setApiQueries] = useState<BasicStringObject>(
    getAPIQueryParams(query, preferences?.paginationDefault)
  )
  const [gqlFilter, setGqlFilter] = useState<GqlFilterObject>({})

  const { dataViewTable, loading, error } = useDataViewsTable({
    dataViewCode,
    apiQueries,
    filter: gqlFilter,
    filtersReady: !filtersLoading,
  })

  const title = location?.state?.title ?? dataViewTable?.title ?? ''
  usePageTitle(title)

  useEffect(() => {
    if (!filterDefinitions) return
    setApiQueries(getAPIQueryParams(query, preferences?.paginationDefault))
    setGqlFilter(buildQueryFilters(query, filterDefinitions))
  }, [query, filterDefinitions])

  useEffect(() => {
    updateQuery({ search: debounceOutput })
  }, [debounceOutput])

  if (error) {
    return <Message error header={strings.ERROR_GENERIC} content={error.message} />
  }

  const searchComponent =
    dataViewTable && dataViewTable?.searchFields?.length > 0 ? (
      <Search
        placeholder={strings.DATA_VIEW_SEARCH_PLACEHOLDER}
        onSearchChange={(e: any) => {
          setSearchText(e.target.value)
          setDebounceInput(e.target.value)
        }}
        input={{ icon: 'search', iconPosition: 'left' }}
        open={false}
        value={searchText}
      />
    ) : null

  return (
    <div id="data-view">
      <div id="list-container" className="data-view-table-container">
        {!codeFromLookupTable && (
          <div className="flex-row-space-between-center" style={{ width: '100%' }}>
            <Header as="h3">{title}</Header>
            {searchComponent}
          </div>
        )}
        <div className="flex-row-space-between-center" style={{ width: '100%' }}>
          {filterDefinitions && (
            <ListFilters
              filterDefinitions={filterDefinitions}
              filterListParameters={{}}
              defaultFilterString={dataViewTable?.defaultFilterString ?? null}
              totalCount={dataViewTable?.totalCount ?? null}
            />
          )}
          {codeFromLookupTable && searchComponent}
        </div>
        {loading && <Loading />}
        {!loading && dataViewTable && (
          <DataViewTableContent dataViewTable={dataViewTable} apiQueries={apiQueries} />
        )}
      </div>
    </div>
  )
}

export default DataViewTable

interface DataViewTableContentProps {
  dataViewTable: DataViewsTableResponse
  apiQueries: DataViewTableAPIQueries
}

const DataViewTableContent: React.FC<DataViewTableContentProps> = ({
  dataViewTable,
  apiQueries,
}) => {
  const { strings } = useLanguageProvider()
  const {
    push,
    updateQuery,
    params: { lookupTableID },
  } = useRouter()
  const showToast = useToast({ style: 'negative' })

  const { headerRow, tableRows, totalCount } = dataViewTable
  const showDetailsForRow = (id: number) =>
    push(`${location.pathname}/${lookupTableID ? dataViewTable.code + '/' : ''}${id}`, {
      dataTableFilterQuery: location.search,
    })

  const sortByColumn = (
    sortColumn: string | undefined,
    columnTitle: string,
    ascending: 'true' | 'false'
  ) => {
    if (!sortColumn) {
      showToast({ text: strings.DATA_VIEW_COLUMN_NOT_SORTABLE.replace('%1', columnTitle) })
      return
    }

    if (ascending === 'false' || !apiQueries.orderBy) updateQuery({ sortBy: sortColumn })
    else
      updateQuery({
        sortBy: `${sortColumn}:desc`,
      })
  }

  return (
    <>
      <Table stackable selectable sortable>
        <Table.Header>
          <Table.Row>
            {headerRow.map(({ title, sortColumn }) => (
              <Table.HeaderCell
                key={title}
                colSpan={1}
                sorted={isSorted(sortColumn, apiQueries)}
                onClick={() => sortByColumn(sortColumn, title, apiQueries?.ascending ?? 'true')}
              >
                {title}
              </Table.HeaderCell>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {tableRows.map(({ id, rowValues }: { id: number; rowValues: any }) => (
            <Table.Row
              key={`row_${id}`}
              className="clickable"
              onClick={() => showDetailsForRow(id)}
            >
              {rowValues.map((value: any, index: number) => (
                <Table.Cell key={`value_${index}`}>
                  {getCellComponent(value, headerRow[index], id)}
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
      {tableRows.length === 0 && (
        <Message warning header={strings.DATA_VIEW_NO_ITEMS_FOUND} style={{ width: '80%' }} />
      )}
      <PaginationBar
        totalCount={totalCount}
        perPageText={strings.OUTCOMES_TABLE_PAGINATION_TEXT}
        strings={strings}
      />
    </>
  )
}

// If the cell contains plugin data, return a SummaryView component, otherwise
// just format the text and return Markdown component
const getCellComponent = (value: any, columnDetails: HeaderRow, id: number) => {
  const { formatting } = columnDetails
  const { elementTypePluginCode } = formatting
  if (elementTypePluginCode) return constructElement(value, columnDetails, id)
  else return <Markdown text={formatCellText(value, columnDetails) || ''} />
}

// These values are not part of the GraphQL "filter" object, so are handled
// separately
const getAPIQueryParams = ({ page = 1, perPage, sortBy }: any, perPageDefault?: number) => {
  const currentPerPage = perPage ?? perPageDefault ?? 20
  const offset = page !== 1 ? String((Number(page) - 1) * Number(currentPerPage)) : undefined
  let orderBy: string | undefined = undefined
  let ascending: 'true' | 'false' | undefined = undefined
  if (sortBy) {
    const [fieldName, direction] = sortBy.split(':')
    orderBy = fieldName
    ascending = direction === 'desc' ? 'false' : 'true'
  }
  return { first: currentPerPage, offset, orderBy, ascending } as BasicStringObject
}

const isSorted = (sortColumn: string | undefined, apiQueries: DataViewTableAPIQueries) => {
  if (!sortColumn) return undefined
  if (sortColumn !== apiQueries.orderBy) return undefined
  return apiQueries.ascending === 'true' ? 'ascending' : 'descending'
}
