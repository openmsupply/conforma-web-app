import React, { useEffect, useRef } from 'react'
import { Container, Grid, Header, Ref, Segment } from 'semantic-ui-react'
import {
  FullStructure,
  SectionAndPage,
  MethodRevalidate,
  ApplicationProps,
} from '../../utils/types'
import { Loading, Navigation, PageElements, ProgressArea } from '../../components'
import { ApplicationStatus } from '../../utils/generated/graphql'
import { checkPageIsAccessible } from '../../utils/helpers/structure'
import { useRouter } from '../../utils/hooks/useRouter'
import usePageTitle from '../../utils/hooks/usePageTitle'
import { useLanguageProvider } from '../../contexts/Localisation'
import { useFormElementUpdateTracker } from '../../contexts/FormElementUpdateTrackerState'
import { useViewport } from '../../contexts/ViewportState'

const ApplicationPage: React.FC<ApplicationProps> = ({
  structure: fullStructure,
  requestRevalidation,
  strictSectionPage,
  isValidating,
}) => {
  const { t } = useLanguageProvider()
  const {
    query: { serialNumber, sectionCode, page },
    push,
    replace,
  } = useRouter()
  const { isMobile } = useViewport()

  const { setState: setUpdateTrackerState } = useFormElementUpdateTracker()
  usePageTitle(t('PAGE_TITLE_APPLICATION', serialNumber))

  const contextRef = useRef<HTMLDivElement>(null)

  const pageNumber = Number(page)

  useEffect(() => {
    if (!fullStructure) return

    // Re-direct based on application status
    if (fullStructure.info.current.status !== ApplicationStatus.Draft)
      replace(`/application/${fullStructure.info.serial}`)

    // Re-direct if trying to access page higher than allowed
    if (!fullStructure.info.isLinear || !fullStructure.info?.firstStrictInvalidPage) return
    const firstIncomplete = fullStructure.info?.firstStrictInvalidPage
    const current = { sectionCode, pageNumber }
    if (!checkPageIsAccessible({ fullStructure, firstIncomplete, current })) {
      const { sectionCode, pageNumber } = firstIncomplete
      push(`/application/${fullStructure.info.serial}/${sectionCode}/Page${pageNumber}`)
    }
  }, [fullStructure, sectionCode, page])

  // update tracker state when page or section changes
  useEffect(() => {
    setUpdateTrackerState({ type: 'resetElementsTracker' })
  }, [sectionCode, page])

  if (!fullStructure || !fullStructure.responsesByCode) return <Loading />

  const {
    info: {
      current: { status },
      isLinear,
      isChangeRequest,
    },
  } = fullStructure

  return (
    <Container id="application-form" className="white-container-decoration">
      <Grid stackable>
        {!isMobile && (
          <Ref innerRef={contextRef}>
            <Grid.Column width={4} id="progress-column" className="dev-border">
              <ProgressArea
                structure={fullStructure}
                requestRevalidation={requestRevalidation as MethodRevalidate}
                strictSectionPage={strictSectionPage as SectionAndPage}
                context={contextRef}
              />
            </Grid.Column>
          </Ref>
        )}
        <Grid.Column width={12} stretched id="form-column">
          <Segment basic>
            <div className="flex-row-space-between">
              <Header as="h4" content={fullStructure.sections[sectionCode].details.title} />
              {isMobile && <p className="xx-small">{`${t('PAGE')} ${pageNumber}`}</p>}
            </div>
            <PageElements
              canEdit={status === ApplicationStatus.Draft}
              isUpdating={isChangeRequest}
              elements={getCurrentPageElements(fullStructure, sectionCode, pageNumber)}
              responsesByCode={fullStructure.responsesByCode}
              stages={fullStructure.stages.map(({ stage }) => stage)}
              applicationData={fullStructure.info}
              isStrictPage={
                sectionCode === strictSectionPage?.sectionCode &&
                pageNumber === strictSectionPage?.pageNumber
              }
            />
          </Segment>
          <Navigation
            current={{ sectionCode, pageNumber }}
            isLinear={isLinear}
            isValidating={!!isValidating}
            sections={fullStructure.sections}
            serialNumber={serialNumber}
            requestRevalidation={requestRevalidation as MethodRevalidate}
          />
        </Grid.Column>
      </Grid>
    </Container>
  )
}

export default ApplicationPage

const getCurrentPageElements = (structure: FullStructure, section: string, page: number) => {
  return structure.sections[section].pages[page].state
}
