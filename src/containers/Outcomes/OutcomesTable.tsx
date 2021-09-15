import React, { useEffect, useState } from 'react'
import { Header, Table } from 'semantic-ui-react'
import { Loading } from '../../components'
import strings from '../../utils/constants'
import usePageTitle from '../../utils/hooks/usePageTitle'
import { useRouter } from '../../utils/hooks/useRouter'
import { useUserState } from '../../contexts/UserState'
import { useOutcomesTable } from '../../utils/hooks/useOutcomes'
import { HeaderRow, OutcomeTableAPIQueries } from '../../utils/types'
import Markdown from '../../utils/helpers/semanticReactMarkdown'
import { constructElement, formatCellText } from './helpers'
import PaginationBar from '../../components/List/Pagination'

const OutcomeTable: React.FC = () => {
  const {
    push,
    query,
    params: { tableName },
  } = useRouter()
  const {
    userState: { templatePermissions },
  } = useUserState()

  const [apiQueries, setApiQueries] = useState<OutcomeTableAPIQueries>({})
  const { outcomeTable, loading, error } = useOutcomesTable({
    tableName,
    apiQueries,
    templatePermissions, // This is only so changing user refreshes the display
  })
  usePageTitle(outcomeTable?.title || '')

  useEffect(() => {
    setApiQueries(getAPIQueryParams(query))
  }, [query])

  if (error) return <p>{error?.message}</p>
  if (loading || !outcomeTable) return <Loading />

  const showDetailsForRow = (id: number) => push(`/outcomes/${tableName}/${id}`)

  const { headerRow, tableRows, title, totalCount } = outcomeTable

  return (
    <div id="outcomes-display">
      <Header as="h4">{title}</Header>
      <div id="list-container" className="outcome-table-container">
        <Table stackable selectable>
          <Table.Header>
            <Table.Row>
              {headerRow.map(({ title }: any) => (
                <Table.HeaderCell key={title} colSpan={1}>
                  {title}
                </Table.HeaderCell>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {tableRows.map((row: any) => (
              <Table.Row
                key={`row_${row.id}`}
                className="clickable"
                onClick={() => showDetailsForRow(row.id)}
              >
                {row.rowValues.map((value: any, index: number) => (
                  <Table.Cell key={`value_${index}`}>
                    {getCellComponent(value, headerRow[index], row.id)}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
        <PaginationBar
          totalCount={totalCount}
          perPageText={strings.OUTCOMES_TABLE_PAGINATION_TEXT}
        />
      </div>
    </div>
  )
}

export default OutcomeTable

// If the cell contains plugin data, return a SummaryView component, otherwise
// just format the text and return Markdown component
const getCellComponent = (value: any, columnDetails: HeaderRow, id: number) => {
  const { formatting } = columnDetails
  const { elementTypePluginCode } = formatting
  if (elementTypePluginCode) return constructElement(value, columnDetails, id)
  else return <Markdown text={formatCellText(value, columnDetails) || ''} />
}

// NOTE: This is temporary -- when we add more filtering and search
// functionality, we will build query objects the same way the list works,
// but it's overkill for this first version
const getAPIQueryParams = ({ page, perPage, sortBy }: any) => {
  const offset = page && perPage ? String((Number(page) - 1) * Number(perPage)) : undefined
  let orderBy: string | undefined = undefined
  let ascending: string | undefined = undefined
  if (sortBy) {
    const [fieldName, direction] = sortBy.split(':')
    orderBy = fieldName
    ascending = direction === 'asc' ? 'true' : 'false'
  }
  return { first: perPage, offset, orderBy, ascending }
}
