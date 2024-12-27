import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { matchPath } from 'react-router'
import { Header, Icon, Message, Label } from 'semantic-ui-react'
import { Loading, NoMatch } from '../../../components'
import { useLanguageProvider } from '../../../contexts/Localisation'

import {
  FullTemplateFragment,
  GetFullTemplateInfoQuery,
  TemplateAction,
  TemplateCategory,
  TemplateDataViewJoin,
  TemplateElement,
  TemplateFilterJoin,
  TemplatePermission,
  TemplateSection,
  TemplateStage,
  TemplateStatus,
  useGetFullTemplateInfoQuery,
} from '../../../utils/generated/graphql'
import { useRouter } from '../../../utils/hooks/useRouter'
import ConfirmationContext from '../shared/ConfirmationContext'
import OperationContext from '../shared/OperationContext'
import TextIO from '../shared/TextIO'
import Actions from './Actions/Actions'
import {
  CreateApplicationWrapper,
  ApplicationWrapper,
  FullApplicationWrapper,
} from './ApplicationWrapper'

import Form from './Form/Form'
import FormWrapper from './Form/FormWrapper'
import General from './General/General'
import Permissions from './Permissions/Permissions'
import { VersionObject } from '../useGetTemplates'
import { DateTime } from 'luxon'
import { isTemplateUnlocked } from './helpers'
import { getVersionString } from './helpers'

export type TemplateInfo = GetFullTemplateInfoQuery['template']

const tabs = [
  {
    route: 'general',
    title: 'General',
    render: () => <General />,
  },
  {
    route: 'form',
    title: 'Form',
    render: () => <Form />,
  },
  {
    route: 'permissions',
    title: 'Permissions',
    render: () => <Permissions />,
  },
  {
    route: 'actions',
    title: 'Actions',
    render: () => <Actions />,
  },
]

export const disabledMessage = 'Can only edit draft procedure, please make it draft or duplicate'

const TemplateContainer: React.FC = () => {
  const {
    match: { path },
    push,
    location,
  } = useRouter()
  const { template } = useTemplateState()
  const { name, code, status, applicationCount, id, versionId, canEdit } = template
  const prevQuery = useRef(location?.state?.queryString ?? '')

  const selected = tabs.find(({ route }) =>
    matchPath(location.pathname, { path: `${path}/${route}`, exact: true, strict: false })
  )

  if (!selected) return <NoMatch />

  return (
    <div className="template-builder-wrapper">
      <Label
        className="back-label clickable"
        onClick={() => push(`/admin/templates${prevQuery.current}`)}
        content={
          <>
            <Icon name="chevron left" className="dark-grey" />
            Templates/Procedures
          </>
        }
      />
      <div className="flex-row-space-between-center-wrap">
        <div className="template-builder-info-bar">
          <TextIO title="version" text={getVersionString(template)} labelNegative />
          <TextIO title="name" text={name} labelNegative />
          <TextIO title="code" text={code} labelNegative />
          <TextIO title="status" text={status} labelNegative />
          <TextIO title="# applications" text={String(applicationCount)} labelNegative />
        </div>
      </div>
      <div className="template-builder-tabs">
        {tabs.map(({ route, title }) => (
          <div
            key={title}
            onClick={() => push(`/admin/template/${id}/${route}`)}
            className={selected.route === route ? 'builder-selected ' : ''}
          >
            <Header as="h4">{title}</Header>
          </div>
        ))}
      </div>
      {!canEdit && versionId !== '*' && (
        <Message warning size="tiny">
          This template version has previously been exported or committed, so can no longer be
          edited. Create a new version by clicking the "Duplicate" icon in the Templates list.
        </Message>
      )}
      <div className="template-builder-content">{selected.render()}</div>
    </div>
  )
}

export interface TemplateState {
  id: number
  isDraft: boolean
  versionId: string
  versionTimestamp: DateTime
  parentVersionId: string | null
  versionHistory: VersionObject[]
  versionComment: string | null
  name: string
  code: string
  status: string
  applicationCount: number
  namePlural: string
  isLinear: boolean
  serialPattern: string
  canApplicantMakeChanges: boolean
  dashboardRestrictions: string[] | null
  priority: number | null
  canEdit: boolean
}

type TemplateContextState = {
  template: TemplateState
  refetch: () => void
  category?: TemplateCategory
  sections: TemplateSection[]
  templateFilterJoins: TemplateFilterJoin[]
  allElements: TemplateElement[]
  fromQuery?: FullTemplateFragment
  templatePermissions: TemplatePermission[]
  templateStages: TemplateStage[]
  actions: TemplateAction[]
  dataViewJoins: TemplateDataViewJoin[]
}

const defaultTemplateContextState: TemplateContextState = {
  template: {
    id: 0,
    isDraft: false,
    versionId: '*',
    versionTimestamp: DateTime.now(),
    parentVersionId: null,
    versionHistory: [],
    versionComment: null,
    name: '',
    code: '',
    status: '',
    applicationCount: 0,
    namePlural: '',
    isLinear: false,
    serialPattern: '',
    canApplicantMakeChanges: true,
    canEdit: true,
    dashboardRestrictions: null,
    priority: null,
  },
  refetch: () => {},
  sections: [],
  allElements: [],
  templateFilterJoins: [],
  templatePermissions: [],
  templateStages: [],
  actions: [],
  dataViewJoins: [],
}

const Context = createContext<TemplateContextState>(defaultTemplateContextState)

const TemplateWrapper: React.FC = () => {
  const { t } = useLanguageProvider()
  const {
    query: { templateId },
  } = useRouter()

  const [state, setState] = useState<TemplateContextState>(defaultTemplateContextState)
  const [firstLoaded, setFirstLoaded] = useState(false)
  const { data, error, refetch } = useGetFullTemplateInfoQuery({
    fetchPolicy: 'network-only',
    variables: { id: Number(templateId) },
  })

  useEffect(() => {
    const template = data?.template
    const sections = (template?.templateSections?.nodes as TemplateSection[]) || []
    const allElements = sections
      .map((section) => (section.templateElementsBySectionId?.nodes as TemplateElement[]) || [])
      .flat()
    if (template) {
      setState({
        template: {
          id: template.id || 0,
          versionId: template?.versionId,
          versionTimestamp: DateTime.fromISO(template?.versionTimestamp) || DateTime.now(),
          parentVersionId: template?.parentVersionId || null,
          versionHistory:
            [...template?.versionHistory]
              .map((version, index) => ({
                ...version,
                number: index + 1,
              }))
              .reverse() || [],
          versionComment: template.versionComment ?? null,
          name: template?.name || '',
          code: template?.code || '',
          namePlural: template?.namePlural || '',
          isLinear: !!template?.isLinear,
          serialPattern: template?.serialPattern || '',
          canApplicantMakeChanges: !!template?.canApplicantMakeChanges,
          status: template?.status || TemplateStatus.Disabled,
          applicationCount: template?.applications?.totalCount || 0,
          isDraft: template.status === TemplateStatus.Draft,
          canEdit: isTemplateUnlocked(template) && template.status === TemplateStatus.Draft,
          dashboardRestrictions: template?.dashboardRestrictions as string[] | null,
          priority: template.priority ?? null,
        },
        category: (template?.templateCategory as TemplateCategory) || undefined,
        fromQuery: template,
        sections,
        allElements,
        refetch,
        templateFilterJoins: (template?.templateFilterJoins?.nodes || []) as TemplateFilterJoin[],
        templatePermissions: (template?.templatePermissions?.nodes || []) as TemplatePermission[],
        templateStages: (template?.templateStages?.nodes || []) as TemplateStage[],
        actions: (template?.templateActions?.nodes || []) as TemplateAction[],
        dataViewJoins: (template?.templateDataViewJoins?.nodes || []) as TemplateDataViewJoin[],
      })
      setFirstLoaded(true)
    }
  }, [data])

  if (error) return <Message error title={t('ERROR_GENERIC')} list={[error]} />

  if (!firstLoaded) return <Loading />
  return (
    <Context.Provider value={state}>
      <OperationContext>
        <ConfirmationContext>
          <FormWrapper>
            <CreateApplicationWrapper>
              <ApplicationWrapper>
                <FullApplicationWrapper>
                  <TemplateContainer />
                </FullApplicationWrapper>
              </ApplicationWrapper>
            </CreateApplicationWrapper>
          </FormWrapper>
        </ConfirmationContext>
      </OperationContext>
    </Context.Provider>
  )
}

export const useTemplateState = () => useContext(Context)
export default TemplateWrapper
