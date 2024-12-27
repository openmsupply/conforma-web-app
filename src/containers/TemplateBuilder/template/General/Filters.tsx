import React, { useState } from 'react'
import { Header, Icon, Label } from 'semantic-ui-react'
import { Loading } from '../../../../components'
import {
  PermissionPolicyType,
  TemplateFilterJoin,
  useGetAllFiltersQuery,
} from '../../../../utils/generated/graphql'
import ButtonWithFallback from '../../shared/ButtonWidthFallback'
import DropdownIO from '../../shared/DropdownIO'
import JsonIO from '../../shared/JsonIO'
import { useOperationState } from '../../shared/OperationContext'
import { getRandomNumber } from '../../shared/OperationContextHelpers'
import TextIO from '../../shared/TextIO'
import { useTemplateState } from '../TemplateWrapper'

type UpdateFilter = {
  code: string
  title: string
  id?: number
  userRole: PermissionPolicyType
  query: object
}

const userRoleOptions = [
  { type: 'APPLY', text: 'Applicant' },
  { type: 'ASSIGN', text: 'Assigner' },
  { type: 'REVIEW', text: 'Reviewer' },
]

const newFilter = {
  id: -1,
  code: 'new code',
  title: 'new filter',
  userRole: PermissionPolicyType.Apply,
  query: { status: 'SUBMITTED' },
}

const Filters: React.FC = () => {
  const [selectedFilterJoin, setSelectedFilterJoin] = useState<TemplateFilterJoin | null>(null)
  const [selectedFilter, setSelectedFilter] = useState(newFilter)
  const [selectedRestriction, setSelectedRestriction] = useState<UpdateFilter>()
  const [selectedRestrictFilter, setSelectedRestrictFilter] = useState<string>()

  const [updateState, setUpdateState] = useState<UpdateFilter | null>(null)
  const { data: allFiltersData, refetch: refetchFilters } = useGetAllFiltersQuery()
  const { template, templateFilterJoins: filterJoins } = useTemplateState()
  const { updateTemplate, updateTemplateFilterJoin } = useOperationState()

  if (!allFiltersData?.filters?.nodes) return <Loading />

  const allFilters = [...(allFiltersData?.filters?.nodes || [])]

  const filterJoinCodes = filterJoins.map((fj) => fj.filter?.code)

  const selectFilterJoin = (filterJoin: TemplateFilterJoin | null) => {
    setSelectedFilterJoin(filterJoin)
    if (filterJoin) {
      const filter = filterJoin?.filter
      setUpdateState({
        code: filter?.code || '',
        title: filter?.title || '',
        id: filter?.id || 0,
        userRole: filter?.userRole || PermissionPolicyType.Apply,
        query: filter?.query,
      })
    } else setUpdateState(null)
  }

  const deleteFilterJoin = async () => {
    if (
      await updateTemplate(template, {
        templateFilterJoinsUsingId: { deleteById: [{ id: selectedFilterJoin?.id || 0 }] },
      })
    ) {
      selectFilterJoin(null)
    }
  }

  const editFilter = async () => {
    if (!updateState) return

    if (
      await updateTemplateFilterJoin(selectedFilterJoin?.id || 0, {
        filterToFilterId: {
          updateById: {
            patch: updateState,
            id: updateState?.id || 0,
          },
        },
      })
    ) {
      refetchFilters()
      selectFilterJoin(null)
    }
  }

  const addFilterJoin = async () => {
    if (selectedFilter?.id !== -1) {
      updateTemplate(template, {
        templateFilterJoinsUsingId: {
          create: [{ filterId: selectedFilter?.id || 0 }],
        },
      })
    } else {
      const { id, code, ...newPartial } = newFilter
      updateTemplate(template, {
        templateFilterJoinsUsingId: {
          create: [
            {
              filterToFilterId: { create: { ...newPartial, code: `newCode_${getRandomNumber()}` } },
            },
          ],
        },
      })
    }
  }

  const addDashboardRestriction = async () => {
    const currentRestrictions = template.dashboardRestrictions ?? []
    if (selectedRestriction)
      updateTemplate(template, {
        dashboardRestrictions: [...currentRestrictions, selectedRestriction?.code],
      })
    setSelectedRestriction(undefined)
    setSelectedRestrictFilter(undefined)
  }

  const removeDashboardRestriction = async () => {
    const newRestrictions = (template.dashboardRestrictions ?? []).filter(
      (el) => el !== selectedRestrictFilter
    )
    setSelectedRestrictFilter(undefined)
    setSelectedRestriction(undefined)
    updateTemplate(template, {
      dashboardRestrictions: newRestrictions.length > 0 ? newRestrictions : null,
    })
  }

  return (
    <>
      <Header as="h3">Dashboard Filters</Header>
      {template.canEdit && (
        <div className="flex-row-start-center">
          <DropdownIO
            value={selectedFilter.id}
            title="Filters"
            options={[...allFilters, newFilter].filter(
              (fil) => !filterJoinCodes.includes(fil?.code)
            )}
            getKey={'id'}
            getValue={'id'}
            getText={'title'}
            setValue={(_, fullValue) => {
              setSelectedFilter(fullValue)
            }}
            additionalStyles={{ marginBottom: 0 }}
          />
          <Icon className="clickable" name="add square" onClick={addFilterJoin} />
        </div>
      )}
      <div className="spacer-20" />
      <div className="filter-joins">
        {filterJoins.map((filterJoin) => (
          <Label
            key={filterJoin.id}
            onClick={
              template.canEdit
                ? () => {
                    selectFilterJoin(filterJoin)
                  }
                : () => {}
            }
            className={`${template.canEdit ? 'clickable' : ''} ${
              filterJoin?.id === selectedFilterJoin?.id ? 'builder-selected' : ''
            }`}
          >
            {filterJoin?.filter?.code}
          </Label>
        ))}
      </div>
      {updateState && (
        <div key={selectedFilterJoin?.id} className="template-builder-filter-input">
          <Header as="h5">{`Edit Filter`}</Header>
          <TextIO
            text={updateState.code}
            title="Code"
            setText={(value: string | null) =>
              setUpdateState({ ...updateState, code: value ?? '' })
            }
          />
          <TextIO
            text={updateState.title}
            title="Title"
            setText={(value: string | null) =>
              setUpdateState({ ...updateState, title: value ?? '' })
            }
          />
          <DropdownIO
            value={updateState.userRole}
            options={userRoleOptions}
            getKey="type"
            getValue="type"
            getText="text"
            title="User Role"
            setValue={(value) => {
              setUpdateState({ ...updateState, userRole: value as PermissionPolicyType })
            }}
          />
          <div className="longer">
            <JsonIO
              key="filterQuery"
              object={updateState.query}
              label="query"
              setObject={(value) => setUpdateState({ ...updateState, query: value })}
            />
          </div>
          <div className="spacer-20" />
          <div className="flex-row">
            <ButtonWithFallback title="Save" onClick={editFilter} />
            <ButtonWithFallback title="Unlink" onClick={() => deleteFilterJoin()} />
            <ButtonWithFallback title="Cancel" onClick={() => selectFilterJoin(null)} />
          </div>
        </div>
      )}
      <Header as="h3">Dashboard Restrictions</Header>
      <p className="smaller-text">
        Template will only appear on Dashboard if the following filters have active applications (no
        restrictions means it'll always appear)
      </p>
      {template.canEdit && (
        <div className="flex-row-start-center">
          <DropdownIO
            value={selectedRestriction?.id ?? 0}
            placeholder="Select filter"
            title="Filters"
            options={allFilters.filter(
              (fil) => !template.dashboardRestrictions?.includes(fil?.code ?? '')
            )}
            getKey={'id'}
            getValue={'id'}
            getText={'title'}
            setValue={(_, fullValue) => {
              setSelectedRestriction(fullValue)
              setSelectedRestrictFilter(undefined)
            }}
            additionalStyles={{ marginBottom: 0 }}
          />
          {selectedRestriction && (
            <Icon className="clickable" name="add square" onClick={addDashboardRestriction} />
          )}
          {selectedRestrictFilter && (
            <Icon className="clickable" name="minus square" onClick={removeDashboardRestriction} />
          )}
        </div>
      )}
      {(template?.dashboardRestrictions?.length ?? 0) > 0 && (
        <>
          <div className="spacer-20" />
          <div className="filter-joins">
            {template.dashboardRestrictions &&
              template.dashboardRestrictions.map((filter) => (
                <Label
                  key={filter}
                  onClick={() => {
                    setSelectedRestrictFilter(filter)
                  }}
                  className={`clickable ${
                    filter === selectedRestrictFilter ? 'builder-selected' : ''
                  }`}
                >
                  {filter}
                </Label>
              ))}
          </div>
        </>
      )}
    </>
  )
}

export default Filters
