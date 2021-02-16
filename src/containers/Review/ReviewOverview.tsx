import React from 'react'
import {
  Button,
  Grid,
  Header,
  Icon,
  Label,
  List,
  Message,
  Progress,
  Segment,
} from 'semantic-ui-react'
import { Loading, NoMatch } from '../../components'
import useGetReviewAssignment from '../../utils/hooks/useGetReviewAssignment'
import { useRouter } from '../../utils/hooks/useRouter'
import strings from '../../utils/constants'
import { Link } from 'react-router-dom'
import { ReviewResponseDecision } from '../../utils/generated/graphql'
import { AssignmentDetails, Page, SectionProgress, SectionState } from '../../utils/types'
import useCreateReview from '../../utils/hooks/useCreateReview'
import { useUserState } from '../../contexts/UserState'
import { getStartLabel, getStatusLabel } from '../../utils/helpers/review/getReviewLabels'

const ReviewOverview: React.FC = () => {
  const {
    push,
    params: { serialNumber },
  } = useRouter()
  const {
    userState: { currentUser },
  } = useUserState()

  const { error, loading, application, assignment, sectionsAssigned } = useGetReviewAssignment({
    reviewerId: currentUser?.userId as number,
    serialNumber,
  })

  const { processing, error: createReviewError, create } = useCreateReview({
    reviewerId: currentUser?.userId as number,
    serialNumber,
    onCompleted: (id: number) => {
      if (serialNumber) {
        // Call Review page after creation
        push(`/application/${serialNumber}/review/${id}`)
      }
    },
  })

  const handleCreate = (_: any) => {
    if (!assignment) {
      console.log('Problem to create review - unexpected parameters')
      return
    }

    create({
      reviewAssigmentId: assignment.id,
      applicationResponses: assignment.questions.map(({ responseId }) => ({
        applicationResponseId: responseId,
      })),
    })
  }

  const getProgressTitle = (progress: SectionProgress, pages: { [pageName: string]: Page }) => {
    if (progress.valid) {
      return progress.completed ? strings.LABEL_REVIEW_COMPLETE : ''
    }
    let declinedResponses = 0
    Object.values(pages).forEach(({ state }) => {
      declinedResponses += state.filter(
        ({ review }) => review?.decision === ReviewResponseDecision.Decline
      ).length
    })
    return declinedResponses > 0
      ? strings.LABEL_REVIEW_DECLINED.replace('%1', declinedResponses.toString())
      : ''
  }

  const getProgresOrLabel = ({ assigned, progress, pages }: SectionState) => {
    if (assigned) {
      if (progress && progress.done > 0 && progress.total > 0) {
        return (
          <Progress
            percent={(100 * progress.done) / progress.total}
            size="tiny"
            success={progress.valid}
            error={!progress.valid}
            label={getProgressTitle(progress, pages)}
          />
        )
      } else if (!assignment?.review) {
        return (
          <Segment vertical>
            <Icon name="circle" size="mini" color="blue" />
            <Label basic>{strings.LABEL_ASSIGNED_TO_YOU}</Label>
          </Segment>
        )
      } else return null
    } else return <p>{strings.LABEL_ASSIGNED_TO_OTHER}</p>
  }

  const getActionButton = ({ review }: AssignmentDetails) => {
    if (review) {
      const { id, status } = review
      return (
        <Button
          as={Link}
          to={`/application/${serialNumber}/review/${id}`}
          content={getStartLabel(status)}
        />
      )
    }
    return (
      <Button loading={processing} onClick={handleCreate}>
        {strings.BUTTON_REVIEW_START}
      </Button>
    )
  }

  return error ? (
    <NoMatch />
  ) : loading ? (
    <Loading />
  ) : application && assignment ? (
    <Segment.Group>
      <Segment textAlign="center">
        <Label color="blue">{strings.STAGE_PLACEHOLDER}</Label>
        <StatusComponent assignment={assignment} />
        <Header content={application.name} subheader={strings.DATE_APPLICATION_PLACEHOLDER} />
        <Header
          as="h3"
          color="grey"
          content={strings.TITLE_REVIEW_SUMMARY}
          subheader={strings.SUBTITLE_REVIEW}
        />
      </Segment>
      <Segment
        style={{
          backgroundColor: 'white',
          padding: 10,
          margin: '0px 50px',
          minHeight: 500,
          flex: 1,
        }}
      >
        <List divided relaxed="very">
          {sectionsAssigned &&
            Object.entries(sectionsAssigned).map(([sectionCode, sectionState]) => {
              const { details } = sectionState
              return (
                <List.Item
                  key={`list-item-${sectionCode}`}
                  children={
                    <Grid>
                      <Grid.Column width={10}>
                        <p>{details.title}</p>
                      </Grid.Column>
                      <Grid.Column width={4} textAlign="center">
                        {getProgresOrLabel(sectionState)}
                      </Grid.Column>
                    </Grid>
                  }
                ></List.Item>
              )
            })}
        </List>
        {getActionButton(assignment)}
      </Segment>
      <Segment>
        {createReviewError && (
          <Message error header={strings.ERROR_REVIEW_OVERVIEW}>
            {createReviewError}
          </Message>
        )}
      </Segment>
    </Segment.Group>
  ) : (
    <Message error content={strings.ERROR_REVIEW_OVERVIEW} />
  )
}

const StatusComponent: React.FC<{ assignment: AssignmentDetails }> = ({ assignment }) => {
  const status = getStatusLabel(assignment)
  if (!status) return null
  const { color, label } = status
  return <Label color={color} content={label} />
}

export default ReviewOverview
