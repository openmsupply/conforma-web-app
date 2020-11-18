import { useEffect, useState } from 'react'
import { Application, useGetApplicationQuery } from '../../utils/generated/graphql'
import useTriggerProcessing from '../../utils/hooks/useTriggerProcessing'
import { getApplicationSections } from '../helpers/getSectionsPayload'
import { ApplicationDetails, TemplateSectionPayload } from '../types'

interface useLoadApplicationProps {
  serialNumber: string
}

const useLoadApplication = (props: useLoadApplicationProps) => {
  const { serialNumber } = props
  const [application, setApplication] = useState<ApplicationDetails | undefined>()
  const [templateSections, setSections] = useState<TemplateSectionPayload[]>([])
  const [appStatus, setAppStatus] = useState({})
  const [isApplicationLoaded, setIsApplicationLoaded] = useState(false)

  const { triggerProcessing, error: triggerError } = useTriggerProcessing({
    serialNumber,
    trigger: 'applicationTrigger',
  })

  const { data, loading, error } = useGetApplicationQuery({
    variables: {
      serial: serialNumber,
    },
    skip: triggerProcessing || isApplicationLoaded,
    fetchPolicy: 'cache-and-network',
  })

  useEffect(() => {
    if (data && data.applicationBySerial) {
      const application = data.applicationBySerial as Application

      setApplication({
        id: application.id,
        type: application.template?.name as string,
        serial: application.serial as string,
        name: application.name as string,
        stage: application.stage as string,
        status: application.status as string,
        outcome: application.outcome as string,
      })

      const sections = getApplicationSections(application.applicationSections)
      setSections(sections)

      setAppStatus({
        stage: application?.stage,
        status: application?.status,
        outcome: application?.outcome,
      })
      setIsApplicationLoaded(true)
    }
  }, [data, loading, error])

  return {
    error: error || triggerError,
    loading: loading || triggerProcessing,
    application,
    templateSections,
    appStatus,
    isApplicationLoaded,
  }
}

export default useLoadApplication
