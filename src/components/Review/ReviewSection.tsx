import React from 'react'
import { Button, Grid, Header, Icon, Segment } from 'semantic-ui-react'
import { SummaryViewWrapper } from '../../formElementPlugins'
import strings from '../../utils/constants'
import { ReviewResponseDecision, TemplateElementCategory } from '../../utils/generated/graphql'
import { ReviewQuestionDecision, ResponsesByCode, SectionElementStates } from '../../utils/types'

interface ReviewSectionProps {
  allResponses: ResponsesByCode
  reviewSection: SectionElementStates
  updateResponses: (props: ReviewQuestionDecision[]) => void
  canEdit: boolean
}

const ReviewSection: React.FC<ReviewSectionProps> = ({
  allResponses,
  reviewSection,
  updateResponses,
  canEdit,
}) => {
  const { section, pages } = reviewSection
  return (
    <Segment
      key={`ReviewSection_${section.code}`}
      inverted
      style={{ backgroundColor: 'WhiteSmoke', margin: '15px 50px 0px' }}
    >
      <Header as="h2" content={`${section.title}`} style={{ color: 'Grey' }} />
      {Object.entries(pages).map(([pageName, elements]) => {
        const elementsToReview = elements
          .filter(({ review }) => review && review.decision === undefined)
          .map(({ review }) => review as ReviewQuestionDecision)
        const reviewsNumber = elementsToReview.length

        return (
          <Segment basic>
            <Header as="h3" style={{ color: 'DarkGrey' }}>
              {pageName}
            </Header>
            {elements.map(({ element, response, review }) => {
              const { category } = element
              const summaryViewProps = {
                element,
                response,
                allResponses,
              }
              if (category === TemplateElementCategory.Question) {
                return (
                  <Segment key={`ReviewElement_${element.code}`} style={{ margin: 10 }}>
                    <Grid columns={2} verticalAlign="middle">
                      <Grid.Row>
                        <Grid.Column width={13}>
                          <SummaryViewWrapper {...summaryViewProps} />
                        </Grid.Column>
                        <Grid.Column width={3}>
                          {review &&
                            canEdit &&
                            (review?.decision === undefined ? (
                              <Button size="small">{strings.BUTTON_REVIEW_RESPONSE}</Button>
                            ) : (
                              <Icon name="pencil square" color="blue" />
                            ))}
                        </Grid.Column>
                      </Grid.Row>
                    </Grid>
                  </Segment>
                )
              }
            })}
            {reviewsNumber > 0 && (
              <Button
                color="blue"
                inverted
                style={{ margin: 10 }}
                onClick={() => {
                  console.log(elementsToReview)
                  updateResponses(
                    elementsToReview.map((review) => ({
                      id: review.id,
                      decision: ReviewResponseDecision.Approve,
                      comment: '',
                    }))
                  )
                }}
              >{`${strings.BUTTON_REVIEW_APPROVE_ALL}(${reviewsNumber})`}</Button>
            )}
          </Segment>
        )
      })}
    </Segment>
  )
}

export default ReviewSection
