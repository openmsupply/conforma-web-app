import React from 'react'
import { Header, Table } from 'semantic-ui-react'
import { Loading } from '../../components'
import usePageTitle from '../../utils/hooks/usePageTitle'
import { useRouter } from '../../utils/hooks/useRouter'
import { useOutcomesTable } from '../../utils/hooks/useOutcomes'
import { HeaderRow } from './types'
import Markdown from '../../utils/helpers/semanticReactMarkdown'
import { constructElement, formatCellText } from './helpers'

const OutcomeTable: React.FC = () => {
  const {
    push,
    params: { tableName },
  } = useRouter()

  const { outcomeTable, loading, error } = useOutcomesTable({ tableName })
  usePageTitle(outcomeTable?.title || '')

  if (error) return <p>{error?.message}</p>
  if (loading || !outcomeTable) return <Loading />

  const showDetailsForRow = (id: number) => push(`/outcomes/${tableName}/${id}`)

  const { headerRow, tableRows, title, totalCount } = outcomeTable

  return (
    <div id="outcomes-display">
      <Header as="h4">{title}</Header>
      <div id="list-container" className="outcome-table-container">
        <Table sortable stackable selectable>
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
            {tableRows.map((row: any) => {
              return (
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
              )
            })}
          </Table.Body>
        </Table>
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
