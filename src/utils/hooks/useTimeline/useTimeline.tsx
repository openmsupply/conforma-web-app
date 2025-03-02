import { useEffect, useState } from 'react'
import { TranslateMethod, useLanguageProvider } from '../../../contexts/Localisation'
import {
  ActivityLog,
  ApplicationStatus,
  Decision,
  EventType,
  useGetActivityLogQuery,
} from '../../generated/graphql'
import { FullStructure } from '../../types'
import {
  getAssignmentEvent,
  getExtensionEvent,
  getOutcomeEvent,
  getReviewEvent,
  getStatusEvent,
} from './eventInterpretation'
import { getDecisionIcon } from './helpers'
import useLocalisedEnums from '../useLocalisedEnums'
import { TimelineStage, Timeline, TimelineEventType, EventOutput, TimelineEvent } from './types'

const useTimeline = (structure: FullStructure) => {
  const {
    t,
    selectedLanguage: { locale },
  } = useLanguageProvider()
  const { Decision: decisionStrings } = useLocalisedEnums()
  const [timeline, setTimeline] = useState<Timeline>()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const {
    data,
    error: apolloError,
    refetch,
  } = useGetActivityLogQuery({
    variables: { applicationId: structure.info.id },
    // fetchPolicy: 'network-only',
  })

  useEffect(() => {
    if (apolloError) {
      setError(apolloError.message)
      setLoading(false)
    }
    if (data?.activityLogs?.nodes) {
      setTimeline(
        buildTimeline(
          data?.activityLogs?.nodes as ActivityLog[],
          structure,
          t,
          decisionStrings,
          locale
        )
      )
      setLoading(false)
    }
  }, [data, apolloError])

  return { error, loading, timeline, refreshTimeline: refetch }
}

export default useTimeline

const buildTimeline = (
  activityLog: ActivityLog[],
  structure: FullStructure,
  translate: TranslateMethod,
  decisionStrings: { [key in Decision]: string },
  locale: string
): Timeline => {
  // Group by stage
  const stages: TimelineStage[] = []
  let stageIndex = -1
  let mostRecentChangeRequestEvent: TimelineEvent | null = null

  activityLog.forEach((event, index) => {
    if (event.type === 'STAGE') {
      // Stages become the parents of all other events
      stages.push({ ...event.details.stage, timestamp: event.timestamp, events: [] })
      stageIndex++
    } else {
      const timelineEvent = {
        id: event.id,
        timestamp: event.timestamp,
        details: event.details,
        ...generateTimelineEvent[event.type](
          event,
          activityLog,
          structure,
          index,
          translate,
          decisionStrings,
          locale
        ),
        logType: event.type,
      }
      if (timelineEvent.eventType === TimelineEventType.Error)
        console.log('Problem with event:', event)

      if (stageIndex < 0) return

      if (
        timelineEvent.eventType === TimelineEventType.ApplicationChangesRequired ||
        timelineEvent.eventType === TimelineEventType.ReviewChangesRequested
      )
        mostRecentChangeRequestEvent = timelineEvent

      if (
        ![
          TimelineEventType.Ignore,
          TimelineEventType.ApplicationChangesRequired,
          TimelineEventType.ReviewChangesRequested,
        ].includes(timelineEvent.eventType)
      )
        stages[stageIndex].events.push(timelineEvent)
    }
  })

  // Add a special "waiting" event if application is currently awaiting changes
  // from applicant or reviewer
  if (
    structure.info.current.status === ApplicationStatus.ChangesRequired &&
    mostRecentChangeRequestEvent
  )
    stages[stageIndex].events.push(mostRecentChangeRequestEvent)

  // Placeholder event if no activity yet in stage
  if (stageIndex > -1 && stages[stageIndex].events.length === 0)
    stages[stageIndex].events.push({
      eventType: TimelineEventType.Ignore,
      displayString: `*${translate('TIMELINE_NO_ACTIVITY')}*`,
      id: 0,
      timestamp: stages[stageIndex].timestamp,
      details: {},
      logType: null,
    })

  // Add emoji icon if last event in stage is a review decision
  stages.forEach((stage, index) => {
    // Don't worry about final stage -- OUTCOME result used instead
    if (index === structure.stages.length - 1) return
    const events = stage.events
    const lastEvent = events[events.length - 1]
    if (lastEvent.eventType === TimelineEventType.ReviewSubmittedWithDecision) {
      const decision = lastEvent?.extras?.reviewDecision?.decision
      lastEvent.displayString = `${getDecisionIcon(decision)} ${lastEvent.displayString}`
    }
  })

  return {
    stages,
    rawLog: activityLog,
  }
}

const generateTimelineEvent: {
  [key in EventType]: (
    event: ActivityLog,
    fullLog: ActivityLog[],
    structure: FullStructure,
    index: number,
    translate: TranslateMethod,
    decisionStrings: {
      [key in Decision]: string
    },
    locale: string
  ) => EventOutput
} = {
  STAGE: () =>
    // Already handled in caller
    ({ eventType: TimelineEventType.Ignore, displayString: '' }),
  STATUS: (event, fullLog, _, __, translate) => getStatusEvent(event, fullLog, translate),
  OUTCOME: (event, _, __, ___, translate) => getOutcomeEvent(event, translate),
  EXTENSION: (event, _, __, ___, translate, ____, locale) =>
    getExtensionEvent(event, translate, locale),
  ASSIGNMENT: (event, _, structure, __, translate) =>
    getAssignmentEvent(event, structure, translate),
  REVIEW: (event, fullLog, structure, index, translate, decisionStrings) =>
    getReviewEvent(event, fullLog, structure, index, translate, decisionStrings),
  REVIEW_DECISION: () =>
    // Ignore all because decision gets combined into Review event
    ({ eventType: TimelineEventType.Ignore, displayString: '' }),
  PERMISSION: () =>
    // Not interpreted in Timeline
    ({ eventType: TimelineEventType.Ignore, displayString: '' }),
}
