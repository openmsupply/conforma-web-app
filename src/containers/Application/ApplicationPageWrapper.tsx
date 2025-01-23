import React, { useState, useEffect } from 'react'
import { Switch, Route } from 'react-router-dom'
import { useRouter } from '../../utils/hooks/useRouter'
import { Loading, NoMatch } from '../../components'
import {
  SectionAndPage,
  MethodRevalidate,
  MethodToCallProps,
  ApplicationProps,
} from '../../utils/types'
import { useLanguageProvider } from '../../contexts/Localisation'
import { Message } from 'semantic-ui-react'
import { ApplicationPage, ApplicationSummary } from '.'
import useGetApplicationStructure from '../../utils/hooks/useGetApplicationStructure'
import { useFormElementUpdateTracker } from '../../contexts/FormElementUpdateTrackerState'

interface MethodToCall {
  (props: MethodToCallProps): void
}

interface RevalidationState {
  methodToCallOnRevalidation: MethodToCall | null
  shouldProcessValidation: boolean
  lastRevalidationRequest: number
}

const ApplicationPageWrapper: React.FC<ApplicationProps> = ({ structure }) => {
  const { t } = useLanguageProvider()
  const {
    match: { path },
  } = useRouter()

  const {
    state: { latestChangedElementUpdateTimestamp },
  } = useFormElementUpdateTracker()

  const [strictSectionPage, setStrictSectionPage] = useState<SectionAndPage | null>(null)
  const [revalidationState, setRevalidationState] = useState<RevalidationState>({
    methodToCallOnRevalidation: null,
    shouldProcessValidation: false,
    lastRevalidationRequest: Date.now(),
  })

  const { error, fullStructure } = useGetApplicationStructure({
    structure,
    shouldRevalidate: revalidationState.shouldProcessValidation,
    minRefetchTimestampForRevalidation: latestChangedElementUpdateTimestamp,
  })

  /* Method to pass to progress bar, next button and submit button to cause revalidation before action can be proceeded
     Should always be called on submit, but only be called on next or progress bar navigation when isLinear */
  const requestRevalidation: MethodRevalidate = (methodToCall) => {
    setRevalidationState({
      methodToCallOnRevalidation: methodToCall,
      shouldProcessValidation: true,
      lastRevalidationRequest: Date.now(),
    })
  }

  // Revalidation Effect
  useEffect(() => {
    if (
      fullStructure &&
      revalidationState.methodToCallOnRevalidation &&
      (fullStructure?.lastValidationTimestamp || Infinity) >
        revalidationState.lastRevalidationRequest
    ) {
      revalidationState.methodToCallOnRevalidation({
        firstStrictInvalidPage: fullStructure.info.firstStrictInvalidPage,
        setStrictSectionPage,
      })
      setRevalidationState({
        ...revalidationState,
        methodToCallOnRevalidation: null,
        shouldProcessValidation: false,
      })
    }
  }, [revalidationState, fullStructure])

  if (error) return <Message error header={t('ERROR_APPLICATION_PAGE')} list={[error]} />

  if (!fullStructure || !fullStructure.responsesByCode) return <Loading />

  return (
    <Switch>
      <Route exact path={`${path}/:sectionCode/Page:page`}>
        <ApplicationPage
          structure={fullStructure}
          requestRevalidation={requestRevalidation as MethodRevalidate}
          strictSectionPage={strictSectionPage}
          isValidating={revalidationState.shouldProcessValidation}
        />
      </Route>
      <Route exact path={`${path}/summary`}>
        <ApplicationSummary
          structure={fullStructure}
          requestRevalidation={requestRevalidation}
          strictSectionPage={strictSectionPage}
        />
      </Route>
      <Route>
        <NoMatch />
      </Route>
    </Switch>
  )
}

export default ApplicationPageWrapper
