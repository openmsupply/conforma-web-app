import React from 'react'
import { Form, Segment } from 'semantic-ui-react'
import {
  ApplicationDetails,
  ElementState,
  PageElement,
  ResponsesByCode,
  SectionAndPage,
} from '../../utils/types'
import { ApplicationViewWrapper } from '../../formElementPlugins'
import { ApplicationViewWrapperProps } from '../../formElementPlugins/types'
import { TemplateElementCategory } from '../../utils/generated/graphql'
import SummaryInformationElement from './Elements/SummaryInformationElement'
import SummaryResponseElement from './Elements/SummaryResponseElement'
import SummaryResponseChangedElement from './Elements/SummaryResponseChangedElement'
import SummaryReviewResponseElement from './Elements/SummaryReviewResponseElement'
import ReviewResponseElement from './Elements/ReviewResponseElement'
import ReviewDecisionElement from './Elements/ReviewDecisionElement'
import ConsolidationDecisionElement from './Elements/ConsolidationDecisionElement'

interface PageElementProps {
  elements: PageElement[]
  responsesByCode: ResponsesByCode
  applicationData: ApplicationDetails
  canEdit?: boolean
  isConsolidation?: boolean
  isReview?: boolean
  isSummary?: boolean
  isStrictPage?: boolean
  serial?: string
  sectionAndPage?: SectionAndPage
}

const PageElements: React.FC<PageElementProps> = ({
  elements,
  responsesByCode,
  applicationData,
  canEdit,
  isConsolidation,
  isReview,
  isSummary,
  isStrictPage,
  serial,
  sectionAndPage,
}) => {
  const visibleElements = elements.filter(({ element }) => element.isVisible)

  // Editable Application page
  if (canEdit && !isReview && !isSummary)
    return (
      <Form className="form-area">
        {visibleElements.map(
          ({ element, isChangeRequest, isChanged, previousApplicationResponse }) => {
            const currentReview = previousApplicationResponse?.reviewResponses.nodes[0]
            const changesRequired =
              isChangeRequest || isChanged
                ? {
                    isChangeRequest: isChangeRequest as boolean,
                    isChanged: isChanged as boolean,
                    reviewerComment: currentReview?.comment || '',
                  }
                : undefined

            const props: ApplicationViewWrapperProps = {
              element,
              isStrictPage,
              changesRequired,
              allResponses: responsesByCode,
              applicationData,
              currentResponse: responsesByCode?.[element.code],
            }
            // Wrapper displays response & changes requested warning for LOQ re-submission
            return <ApplicationViewWrapper key={`question_${element.code}`} {...props} />
          }
        )}
      </Form>
    )

  const getSummaryViewProps = (element: ElementState) => ({
    element,
    response: responsesByCode?.[element.code],
    allResponses: responsesByCode,
    applicationData,
  })

  // Summary Page
  if (isSummary) {
    const { sectionCode, pageNumber } = sectionAndPage as SectionAndPage
    return (
      <Form>
        {visibleElements.map((state) => {
          const {
            element,
            isChanged,
            isChangeRequest,
            previousApplicationResponse,
            latestApplicationResponse,
          } = state

          const props = {
            canEdit: !!canEdit,
            linkToPage: `/application/${serial}/${sectionCode}/Page${pageNumber}`,
            summaryViewProps: getSummaryViewProps(element),
            latestApplicationResponse: latestApplicationResponse,
            previousApplicationResponse: previousApplicationResponse,
          }

          const changedQuestionResponse = !isChangeRequest && !isChanged

          return (
            <div key={`question_${element.id}`}>
              <Segment basic className="summary-page-element">
                {element.category === TemplateElementCategory.Question ? (
                  changedQuestionResponse ? (
                    <SummaryResponseElement {...props} />
                  ) : (
                    <SummaryResponseChangedElement {...props} />
                  )
                ) : (
                  <SummaryInformationElement {...props} />
                )}
              </Segment>
              {isChangeRequest && <SummaryReviewResponseElement {...props} />}
            </div>
          )
        })}
      </Form>
    )
  }

  // TODO: Find out problem to display edit button with review responses when Review is locked

  // Review & Consolidation
  if (isReview) {
    return (
      <Form>
        {visibleElements.map(
          ({
            element,
            thisReviewLatestResponse,
            latestOriginalReviewResponse,
            isNewApplicationResponse,
            latestApplicationResponse,
          }) => {
            const props = {
              latestApplicationResponse,
              isNewApplicationResponse: !!isNewApplicationResponse,
              summaryViewProps: getSummaryViewProps(element),
              reviewResponse: thisReviewLatestResponse,
              originalReviewResponse: latestOriginalReviewResponse,
            }

            const isChangeRequest: boolean = !!thisReviewLatestResponse?.decision

            return (
              <div key={`${element.code}ReviewContainer`}>
                <Segment basic key={`question_${element.id}`} className="summary-page-element">
                  {element.category === TemplateElementCategory.Question ? (
                    <ReviewResponseElement {...props} />
                  ) : (
                    <SummaryInformationElement {...props} />
                  )}
                  {thisReviewLatestResponse && isConsolidation ? (
                    <ConsolidationDecisionElement {...props} />
                  ) : (
                    <ReviewDecisionElement {...props} />
                  )}
                </Segment>
              </div>
            )
          }
        )}
      </Form>
    )
  }
  return null
}

export default PageElements
