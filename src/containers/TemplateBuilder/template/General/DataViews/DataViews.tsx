import React, { useState } from 'react'
import { Button, Dropdown, Header, Icon, Label } from 'semantic-ui-react'
import { useTemplateState } from '../../TemplateWrapper'
import DropdownIO from '../../../shared/DropdownIO'
import { DataViewFilter, useDataViews } from './useManageDataViews'
import { useOperationState } from '../../../shared/OperationContext'

export const DataViewSelector: React.FC<{}> = () => {
  const { template } = useTemplateState()
  const { updateTemplate } = useOperationState()
  const [menuSelection, setMenuSelection] = useState<number>()
  const [menuFilter, setMenuFilter] = useState<DataViewFilter>('SUGGESTED')
  const [selectedDataViewJoinId, setSelectedDataViewJoinId] = useState<number>()
  const { current, menuItems } = useDataViews(menuFilter)

  const menuOptions = menuItems.map(({ id, code, identifier, title }) => ({
    key: identifier,
    value: id,
    text:
      id === menuSelection ? (
        title
      ) : (
        <>
          {title}
          <br />
          <span className="smaller-text">Code: {code}</span>
          <br />
          <span className="smaller-text">ID: {identifier}</span>
        </>
      ),
  }))

  const addDataViewJoin = async () => {
    if (menuSelection) {
      setMenuSelection(undefined)
      await updateTemplate(template, {
        templateDataViewJoinsUsingId: { create: [{ dataViewId: menuSelection }] },
      })
    }
  }

  const addAllInMenu = () => {
    updateTemplate(template, {
      templateDataViewJoinsUsingId: {
        create: menuItems.map(({ id }) => ({ dataViewId: id })),
      },
    })
  }

  const deleteDataViewJoin = async () => {
    if (selectedDataViewJoinId) {
      await updateTemplate(template, {
        templateDataViewJoinsUsingId: { deleteById: [{ id: selectedDataViewJoinId }] },
      })
      setSelectedDataViewJoinId(undefined)
    }
  }

  const hasInaccessible = current.some((dv) => !dv.applicantAccessible && !dv.inOutputTables)
  const hasTemplateElements = current.some((dv) => dv.inTemplateElements)
  const hasOutputTables = current.some((dv) => dv.inOutputTables)

  return (
    <>
      <Header as="h3">Connected Data Views</Header>
      {template.canEdit && (
        <div className="flex-row-start-center" style={{ gap: 5, marginBottom: 10 }}>
          <Dropdown
            placeholder="Search Data Views"
            selection
            options={menuOptions}
            search={(data, searchText) => {
              const matching = menuItems
                .filter(({ code }) => code.includes(searchText))
                .map(({ id }) => id)
              console.log(matching)
              return data.filter((item) => matching.includes(item.value as number))
            }}
            value={menuSelection ?? ''}
            onChange={(_, { value }) => {
              setMenuSelection(value as number)
              setSelectedDataViewJoinId(undefined)
            }}
            style={{ minWidth: 300 }}
          ></Dropdown>
          {menuSelection ? (
            <Icon className="clickable" name="add square" size="large" onClick={addDataViewJoin} />
          ) : (
            <Icon
              className="clickable"
              size="large"
              name="minus square"
              onClick={deleteDataViewJoin}
              style={{ visibility: selectedDataViewJoinId ? 'visible' : 'hidden' }}
            />
          )}
          <DropdownIO
            value={menuFilter}
            title="Filter menu"
            options={[
              { key: 'elements', text: 'In Form Elements', value: 'IN_ELEMENTS' },
              { key: 'outcomes', text: 'In Outcome Tables', value: 'IN_OUTCOMES' },
              { key: 'suggested', text: 'All in use', value: 'SUGGESTED' },
              { key: 'all', text: 'All', value: 'ALL' },
              { key: 'applicant', text: 'Accessible to Applicant', value: 'APPLICANT_ACCESSIBLE' },
            ]}
            getKey={'key'}
            getValue={'value'}
            getText={'text'}
            setValue={(_, { value }) => setMenuFilter(value)}
            minLabelWidth={0}
            additionalStyles={{ marginBottom: 0 }}
          />
          {menuItems.length > 0 &&
            ['SUGGESTED', 'IN_ELEMENTS', 'IN_OUTCOMES'].includes(menuFilter) && (
              <Button primary size="mini" content="Add all in menu" onClick={addAllInMenu} />
            )}
        </div>
      )}
      <div className="filter-joins">
        {current.map((dv) => (
          <>
            <Label
              key={dv.identifier}
              className={`${template.canEdit ? 'clickable' : ''}${
                dv.dataViewJoinId === selectedDataViewJoinId ? ' builder-selected' : ''
              }${
                !dv.applicantAccessible && !dv.inOutputTables
                  ? ' dv-inaccessible'
                  : dv.inTemplateElements
                  ? ' dv-elements'
                  : dv.inOutputTables
                  ? ' dv-outcomes'
                  : ''
              }`}
              style={{ fontSize: '100%', position: 'relative' }}
              onClick={() => {
                if (!template.canEdit) return
                if (dv.dataViewJoinId === selectedDataViewJoinId)
                  setSelectedDataViewJoinId(undefined)
                else {
                  setSelectedDataViewJoinId(dv.dataViewJoinId)
                  setMenuSelection(undefined)
                }
              }}
            >
              <div
                className="ext-icon clickable"
                onClick={() =>
                  window.open(
                    `/admin/data-views?selected-table=${dv.tableName}&data-view=${dv.identifier}`,
                    '_blank'
                  )
                }
              >
                <Icon name="external" size="small" className="floating-icon clickable" />
              </div>
              {dv.title}
              <br />
              <span className="slightly-smaller-text" style={{ fontWeight: 400 }}>
                <strong>Code:</strong> {dv.code}
                <br /> <strong>ID:</strong> {dv.identifier}
              </span>
            </Label>
          </>
        ))}
      </div>
      <div>
        {(hasInaccessible || hasTemplateElements || hasOutputTables) && (
          <Header as="h4" style={{ marginBottom: 5, marginTop: 10 }}>
            Legend
          </Header>
        )}
        <div className="flex-row" style={{ gap: 10 }}>
          {hasInaccessible && (
            <Label
              key="legend-inaccessible"
              className="dv-inaccessible"
              content="Applicant does NOT have permission to view, but is used in form elements"
              style={{ maxWidth: 250 }}
            />
          )}
          {hasTemplateElements && (
            <Label key="legend-form" className="dv-elements" content="Used in Form elements" />
          )}
          {hasOutputTables && (
            <Label
              key="legend-output"
              className="dv-outcomes"
              content="Used in data output actions"
            />
          )}
        </div>
      </div>
    </>
  )
}
