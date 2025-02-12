import React, { useEffect, useState } from 'react'
import { Button, Header, Icon, List, Segment, Container, Loader } from 'semantic-ui-react'
import Markdown from '../../utils/helpers/semanticReactMarkdown'
import { ApplicationProps } from '../../utils/types'
import { useUserState } from '../../contexts/UserState'
import { Stage } from '../../components/Review'
import { useRouter } from '../../utils/hooks/useRouter'
import { FigTree } from '../../FigTreeEvaluator'
import { useLanguageProvider } from '../../contexts/Localisation'
import { Link } from 'react-router-dom'
import { ApplicationStatus } from '../../utils/generated/graphql'
import useGetApplicationStructure from '../../utils/hooks/useGetApplicationStructure'

const ApplicationSubmission: React.FC<ApplicationProps> = ({ structure }) => {
  const [submissionMessageEvaluated, setSubmissionMessageEvaluated] = useState<string>()
  const { t } = useLanguageProvider()
  const {
    userState: { isNonRegistered, currentUser },
    logout,
  } = useUserState()

  const {
    query: { serialNumber },
    push,
  } = useRouter()
  const {
    info: {
      current: { status },
      submissionMessage,
    },
    stages,
  } = structure

  const { fullStructure } = useGetApplicationStructure({
    structure,
  })

  // Evaluate submission message
  useEffect(() => {
    if (!fullStructure || !fullStructure?.responsesByCode) return
    FigTree.evaluate(submissionMessage, {
      data: {
        responses: fullStructure.responsesByCode,
        currentUser,
        applicationData: fullStructure.info,
      },
    }).then((result) => {
      setSubmissionMessageEvaluated(result as string)
    })
  }, [fullStructure])

  // Check if application not submitted and redirect to the summary page
  // Note: The summary page has its own redirection logic to a specific page (with invalid items).
  if (status === ApplicationStatus.Draft || status === ApplicationStatus.ChangesRequired)
    push(`/application/${serialNumber}/summary`)

  return (
    <Container id="application-summary">
      <Segment basic textAlign="center" id="submission-header">
        <Header as="h4" icon>
          <Icon name="clock outline" className="information-colour" size="huge" />
          {t('LABEL_PROCESSING')}
        </Header>
        {submissionMessageEvaluated ? (
          <Markdown text={submissionMessageEvaluated || ''} />
        ) : (
          <Loader />
        )}
      </Segment>
      {!isNonRegistered && (
        <>
          <Segment basic textAlign="left" id="submission-content">
            <p className="dark-grey">{t('SUBTITLE_SUBMISSION_STEPS')}</p>
            <List>
              {stages.map(({ stage: { name, description, colour } }) =>
                name ? (
                  <List.Item key={`list_stage_${name}`}>
                    <List.Content>
                      <List.Header>
                        <Stage name={name} colour={colour as string} />
                      </List.Header>
                      <List.Description>{description}</List.Description>
                    </List.Content>
                  </List.Item>
                ) : null
              )}
            </List>
          </Segment>
          <Segment basic textAlign="center" id="submission-nav">
            <Button
              color="blue"
              as={Link}
              to={`/application/${serialNumber}/summary`}
              content={t('BUTTON_VIEW_APPLICATION')}
            />
            <p>
              <Link to={'/'}>
                <strong>{t('BUTTON_BACK_DASHBOARD')}</strong>
              </Link>
            </p>
          </Segment>
        </>
      )}
      {isNonRegistered && (
        <Segment basic textAlign="center" id="submission-nav">
          <Button primary onClick={() => logout()}>
            {t('ACTION_CONTINUE')}
          </Button>
        </Segment>
      )}
    </Container>
  )
}

export default ApplicationSubmission
