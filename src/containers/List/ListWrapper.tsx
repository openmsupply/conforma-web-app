import React, { useEffect, useState } from 'react'
import { Container, List, Label, Segment, Button, Search, Grid } from 'semantic-ui-react'
import { Loading, FilterList } from '../../components'
import { useRouter } from '../../utils/hooks/useRouter'
import useListApplications from '../../utils/hooks/useListApplications'
import strings from '../../utils/constants'
import getDefaultUserRole from '../../utils/helpers/list/findUserRole'
import { useUserState } from '../../contexts/UserState'
import mapColumnsByRole from '../../utils/helpers/list/mapColumnsByRole'
import { ColumnDetails, SortQuery } from '../../utils/types'
import { USER_ROLES } from '../../utils/data'
import { Link } from 'react-router-dom'
import ApplicationsList from '../../components/List/ApplicationsList'
import PaginationBar from '../../components/List/Pagination'
import { ApplicationList } from '../../utils/generated/graphql'

const ListWrapper: React.FC = () => {
  const { query, push, updateQuery } = useRouter()
  const { type, userRole } = query
  const {
    userState: { templatePermissions },
  } = useUserState()
  const [columns, setColumns] = useState<ColumnDetails[]>([])
  const [searchText, setSearchText] = useState<string>(query?.search)
  const [sortQuery, setSortQuery] = useState<SortQuery>(getInitialSortQuery(query?.sortBy))
  const [applicationsRows, setApplicationsRows] = useState<ApplicationList[] | undefined>()
  const { error, loading, applications, applicationCount } = useListApplications(query)

  useEffect(() => {
    if (templatePermissions) {
      if (!type || !userRole) redirectToDefault()
      else {
        setApplicationsRows(undefined)
        const columns = mapColumnsByRole(userRole as USER_ROLES)
        setColumns(columns)
      }
    }
  }, [templatePermissions, type, userRole])

  useEffect(() => {
    if (!loading && applications) {
      setApplicationsRows(applications)
    }
  }, [loading, applications])

  useEffect(() => {
    updateQuery({ search: searchText })
  }, [searchText])

  useEffect(() => {
    const { sortColumn, sortDirection } = sortQuery
    updateQuery({
      sortBy: sortColumn
        ? `${sortColumn}${sortDirection === 'ascending' ? ':asc' : ''}`
        : undefined,
    })
  }, [sortQuery])

  const redirectToDefault = () => {
    const redirectType = type || Object.keys(templatePermissions)[0]
    const redirectUserRole = userRole || getDefaultUserRole(templatePermissions, redirectType)
    if (redirectType && redirectUserRole)
      push(`/applications?type=${redirectType}&user-role=${redirectUserRole}`)
    else {
      // To-Do: Show 404 if no default found
    }
  }

  const handleSearchChange = (e: any) => {
    setSearchText(e.target.value)
  }

  const handleSort = (sortName: string) => {
    const { sortColumn, sortDirection } = sortQuery
    switch (true) {
      case sortName === sortColumn && sortDirection === 'descending':
        setSortQuery({ sortColumn: sortName, sortDirection: 'ascending' })
        break
      case sortName === sortColumn && sortDirection === 'ascending':
        setSortQuery({})
        break
      default:
        // Clicked on a new column
        setSortQuery({ sortColumn: sortName, sortDirection: 'descending' })
        break
    }
  }

  return error ? (
    <Label content={strings.ERROR_APPLICATIONS_LIST} error={error} />
  ) : loading ? (
    <Loading />
  ) : (
    <Container>
      <FilterList />
      <Segment vertical>
        {Object.keys(query).length > 0 && <h3>Query parameters:</h3>}
        <List>
          {Object.entries(query).map(([key, value]) => (
            <List.Item key={`ApplicationList-parameter-${value}`} content={key + ' : ' + value} />
          ))}
        </List>
        <Grid columns={3} style={{ marginTop: '5px' }}>
          <Grid.Row>
            <Grid.Column width={3}>
              <Search
                // size="large"
                placeholder={strings.PLACEHOLDER_SEARCH}
                onSearchChange={handleSearchChange}
                open={false}
                value={searchText}
              />
            </Grid.Column>
            <Grid.Column textAlign="left" verticalAlign="middle">
              <Button content={strings.BUTTON_CLEAR_SEARCH} onClick={() => setSearchText('')} />
            </Grid.Column>
            <Grid.Column textAlign="right" verticalAlign="middle" floated="right">
              <Button
                as={Link}
                to={`/application/new?type=${type}`}
                content={strings.BUTTON_APPLICATION_NEW}
              />
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </Segment>
      {columns && applicationsRows && (
        <ApplicationsList
          columns={columns}
          applications={applicationsRows}
          sortQuery={sortQuery}
          handleSort={handleSort}
        />
      )}
      {/* <Grid columns={1}>
        <Grid.Row>
          <Grid.Column width={5} floated="right"> */}
      <PaginationBar totalCount={applicationCount} />
      {/* </Grid.Column>
        </Grid.Row>
      </Grid> */}
    </Container>
  )
}

export default ListWrapper

const getInitialSortQuery = (query: string): SortQuery => {
  if (!query) return {}
  const [sortColumn, direction] = query.split(':')
  return {
    sortColumn,
    sortDirection: direction === 'asc' ? 'ascending' : 'descending',
  }
}
