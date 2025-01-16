import React, { createContext, useContext } from 'react'
import { useEffect, useState } from 'react'
import { Header } from 'semantic-ui-react'
import { Loading } from '../../../../components'

import { ActionPlugin, Trigger, useGetAllActionsQuery } from '../../../../utils/generated/graphql'
import DropdownIO from '../../shared/DropdownIO'
import { IconButton } from '../../shared/IconButton'
import { stringSort } from '../Permissions/PermissionNameInfo/PermissionNameInfo'
import { disabledMessage, useTemplateState } from '../TemplateWrapper'
import TriggerDisplay from './TriggerDisplay'
import { useFormStructureState } from '../Form/FormWrapper'
import { getRequest } from '../../../../utils/helpers/fetchMethods'
import getServerUrl from '../../../../utils/helpers/endpoints/endpointUrlBuilder'
import { useRouter } from '../../../../utils/hooks/useRouter'

type ActionsByCode = { [actionCode: string]: ActionPlugin }

type ActionContext = {
  allActionsByCode: ActionsByCode
  applicationData: { [key: string]: any }
  loading?: boolean
}

const Context = createContext<ActionContext>({
  allActionsByCode: {},
  applicationData: {},
})

const ActionsWrapper: React.FC = () => {
  const [state, setState] = useState<ActionContext>({
    allActionsByCode: {},
    applicationData: {},
    loading: true,
  })
  const { data } = useGetAllActionsQuery()
  const { configApplicationId } = useFormStructureState()
  const { getParsedUrlQuery } = useRouter()

  useEffect(() => {
    const allActions = data?.actionPlugins?.nodes
    if (!allActions) return
    const allActionsByCode: ActionsByCode = {}

    allActions.forEach((actionPlugin) => {
      if (!actionPlugin) return
      allActionsByCode[String(actionPlugin?.code)] = actionPlugin as ActionPlugin
    })

    if (!configApplicationId) return
    getRequest(getServerUrl('getApplicationData', { applicationId: configApplicationId })).then(
      (applicationData) => {
        // Current url queries will *NOT* be available when actions run, but
        // this provides a way of simulating values in the Template Builder
        const currentUrlQuery = getParsedUrlQuery()
        applicationData.urlProperties = { ...currentUrlQuery, ...applicationData.urlProperties }
        setState({ allActionsByCode, applicationData, loading: false })
      }
    )
  }, [data, configApplicationId])

  if (state.loading) return <Loading />

  return (
    <Context.Provider value={state}>
      <Actions />
    </Context.Provider>
  )
}

export const useActionState = () => useContext(Context)

const Actions: React.FC = () => {
  const [selectedTrigger, setSelectedTrigger] = useState<Trigger | null>(null)
  const [usedTriggers, setUsedTrigger] = useState<Trigger[]>([])
  const {
    actions,
    template: { canEdit },
  } = useTemplateState()

  useEffect(() => {
    const newUsedTriggers = [...usedTriggers]
    actions.forEach((action) => {
      if (newUsedTriggers.includes(action?.trigger || Trigger.OnApplicationCreate)) return
      newUsedTriggers.push(action?.trigger || Trigger.OnApplicationCreate)
    })
    setUsedTrigger(newUsedTriggers.sort(stringSort))
  }, [])

  const allTriggers = Object.values(Trigger)
  const availableTriggers = allTriggers.filter((trigger) => !usedTriggers.includes(trigger))

  const addTrigger = () => {
    if (!selectedTrigger) return
    setUsedTrigger([...usedTriggers, selectedTrigger].sort(stringSort))
    setSelectedTrigger(null)
  }

  return (
    <div className="flew-column-start-start">
      <div className="flex-row-start-center flex-gap-20">
        <Header as="h4" className="no-margin-no-padding">
          Triggers
        </Header>
        <DropdownIO
          title=""
          isPropUpdated={true}
          value={String(selectedTrigger)}
          disabled={!canEdit}
          placeholder={availableTriggers.length === 0 ? 'All triggers are in use' : 'Select To Add'}
          disabledMessage={disabledMessage}
          minLabelWidth={0}
          setValue={(trigger) => {
            setSelectedTrigger(trigger as Trigger)
          }}
          options={availableTriggers}
          additionalStyles={{ margin: 0 }}
        />
        {selectedTrigger && (
          <IconButton
            name="add square"
            onClick={addTrigger}
            disabled={!canEdit}
            size="large"
            disabledMessage={disabledMessage}
          />
        )}
      </div>

      {usedTriggers.map((trigger) => (
        <TriggerDisplay key={trigger} trigger={trigger} allTemplateActions={actions} />
      ))}
    </div>
  )
}

export default ActionsWrapper
