import { useEffect, useState } from 'react'
import {
  ApplicationDetails,
  ApplicationScheduledEvents as ApplicationScheduledEvent,
  ElementBase,
  EvaluatedElement,
  FullStructure,
  TemplateDetails,
  UseGetApplicationProps,
} from '../types'
import evaluate from '../../modules/expression-evaluator'
import { useUserState } from '../../contexts/UserState'
import { EvaluatorParameters } from '../types'
import {
  ApplicationStageStatusAll,
  ApplicationStatus,
  Organisation,
  TemplateElement,
  TemplateElementCategory,
  TemplateSection,
  TemplateStage,
  TemplateStageReviewLevel,
  useGetApplicationQuery,
  UserList as User,
} from '../generated/graphql'
import { useLanguageProvider } from '../../contexts/Localisation'
import { buildSectionsStructure } from '../helpers/structure'
import config from '../../config'
import { getSectionDetails } from '../helpers/application/getSectionsDetails'
import useTriggers from './useTriggers'
import getServerUrl, { serverGraphQL, serverREST } from '../helpers/endpoints/endpointUrlBuilder'
import { useRouter } from './useRouter'

const graphQLEndpoint = getServerUrl('graphQL')
const JWT = localStorage.getItem(config.localStorageJWTKey)

const useLoadApplication = ({ serialNumber }: UseGetApplicationProps) => {
  const { t } = useLanguageProvider()
  const [isLoading, setIsLoading] = useState(true)
  const [structureError, setStructureError] = useState('')
  const [structure, setStructure] = useState<FullStructure>()
  const {
    userState: { currentUser },
  } = useUserState()
  const { getParsedUrlQuery } = useRouter()

  const {
    ready: triggersReady,
    loading: triggersLoading,
    error: triggersError,
    recheckTriggers,
  } = useTriggers(serialNumber)

  const { data, loading, error } = useGetApplicationQuery({
    variables: {
      serial: serialNumber,
    },
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
    skip: !triggersReady,
  })

  useEffect(() => {
    if (triggersError) {
      setStructureError(t('ERROR_TRIGGER'))
      console.error('Trigger error:', triggersError)
      return
    }

    if (loading || triggersLoading) {
      setIsLoading(true)
      return
    }

    if (!triggersReady || !data) return

    const application = data.applicationBySerial

    // No unexpected error - just a application not accessible to user (Show 404 page)
    if (!application) {
      setIsLoading(false)
      return
    }

    if (!application.template) {
      setStructureError(t('APPLICATION_MISSING_TEMPLATE'))
      return
    }

    // TODO this is hacky, useTrigger should be a context, so that it can be re-triggered in ApplicationSections when 'restartApplication`
    if (application.trigger !== null) return recheckTriggers()

    // Building the structure...
    setIsLoading(true)

    const sections = (application?.template?.templateSections?.nodes || []) as TemplateSection[]
    const sectionDetails = getSectionDetails(sections)

    const stages = data.applicationStageStatusLatests?.nodes as ApplicationStageStatusAll[]
    if (stages.length > 1) console.log('StageStatusAll More than one results for 1 application!')
    const {
      stageId,
      stage,
      stageColour,
      stageNumber,
      status,
      statusHistoryTimeCreated,
      stageHistoryTimeCreated,
    } = stages[0] // Should only have one result

    const applicationDetails: ApplicationDetails = {
      id: application.id,
      template: application.template as TemplateDetails,
      isLinear: application.template?.isLinear as boolean,
      serial: application.serial as string,
      name: application.name as string,
      outcome: application.outcome as string,
      current: {
        stage: {
          id: stageId as number,
          name: stage as string,
          number: stageNumber as number,
          colour: stageColour as string,
        },
        status: status as ApplicationStatus,
        timeStageCreated: stageHistoryTimeCreated,
        timeStatusCreated: statusHistoryTimeCreated,
      },
      firstStrictInvalidPage: null,
      isChangeRequest: false,
      hasPreviewActions: application.template.previewActions.totalCount > 0,
      user: application?.user as User,
      org: application?.org as Organisation,
      config: {
        serverGraphQL,
        serverREST,
        getServerUrl,
        isProductionBuild: config.isProductionBuild,
        version: config.version,
      },
      // Current "query" shouldn't be needed in live application, but useful for
      // TemplateBuilder to simulate possible queries
      urlProperties: { ...getParsedUrlQuery(), ...application.urlProperties } ?? {},
    }

    const baseElements: ElementBase[] = []
    sections.forEach((section) => {
      let pageCount = 1
      const elementsInSection = section?.templateElementsBySectionId?.nodes as TemplateElement[]
      elementsInSection.forEach((element) => {
        if (element.elementTypePluginCode === 'pageBreak') pageCount++
        else
          baseElements.push({
            category: element.category || TemplateElementCategory.Information,
            id: element.id,
            code: element.code,
            pluginCode: element.elementTypePluginCode || '',
            sectionIndex: section?.index || 0,
            sectionCode: section?.code || '',
            elementIndex: element.index || 0,
            page: pageCount,
            isEditableExpression: element.isEditable,
            isRequiredExpression: element.isRequired,
            isVisibleExpression: element.visibilityCondition,
            parameters: element.parameters,
            validationExpression: element.validation,
            validationMessage: element.validationMessage || '',
            helpText: element.helpText || '',
            title: element.title || '',
            reviewability: element.reviewability,
            // reviewRequired: element.reviewRequired,
            initialValueExpression: element.initialValue,
            ...defaultEvaluatedElement,
          })
      })
    })

    const canApplicantMakeChanges = application.template?.canApplicantMakeChanges ?? true

    const applicantDeadline: ApplicationScheduledEvent | undefined = (
      (application?.triggerSchedules?.nodes || []) as {
        id: number
        timeScheduled: string
        eventCode: string
        isActive: boolean
      }[]
    )
      .filter((event) => event.eventCode === config.applicantDeadlineCode)
      .map(({ id, timeScheduled, eventCode, isActive }) => ({
        id,
        timeScheduled: new Date(timeScheduled),
        eventCode,
        isActive,
      }))[0]

    const templateStages = application.template?.templateStages.nodes as TemplateStage[]

    const evaluatorParams: EvaluatorParameters = {
      objects: { currentUser, applicationData: applicationDetails },
      APIfetch: fetch,
      graphQLConnection: { fetch: fetch.bind(window), endpoint: graphQLEndpoint },
      headers: { Authorization: 'Bearer ' + JWT },
    }

    const getStageAndLevels = (stage: TemplateStage) => {
      const stageLevels =
        (stage.templateStageReviewLevelsByStageId?.nodes as TemplateStageReviewLevel[]) || []
      return {
        stage: {
          id: stage.id,
          name: stage.title as string,
          number: stage.number as number,
          description: stage.description ? stage.description : undefined,
          colour: stage.colour as string,
        },
        levels: stageLevels.map(({ name: levelName, number: levelNumber }) => ({
          name: levelName as string,
          number: levelNumber as number,
        })),
      }
    }

    evaluate(application.template?.startMessage || '', evaluatorParams).then((startMessage) => {
      let newStructure: FullStructure = {
        info: {
          ...applicationDetails,
          submissionMessage: application.template?.submissionMessage,
          startMessage: startMessage as string,
        },
        stages: templateStages.map((stage) => getStageAndLevels(stage)),
        sections: buildSectionsStructure({ sectionDetails, baseElements, page: t('PAGE') }),
        applicantDeadline: applicantDeadline
          ? { deadline: applicantDeadline.timeScheduled, isActive: applicantDeadline.isActive }
          : { deadline: null, isActive: false },
        canApplicantMakeChanges,
        attemptSubmission: false,
        reload: reloadApplication,
      }

      setStructure(newStructure)
      setIsLoading(false)
    })
  }, [data, loading, triggersReady, triggersLoading, triggersError])

  const reloadApplication = async () => {
    console.log('Reloading...')
    recheckTriggers()
  }

  return {
    error: structureError || error?.message,
    isLoading: loading || isLoading,
    structure,
    reloadApplication,
  }
}

export const defaultEvaluatedElement: EvaluatedElement = {
  isEditable: true,
  isRequired: true,
  isVisible: true,
  isValid: undefined,
  initialValue: null,
}

export default useLoadApplication
