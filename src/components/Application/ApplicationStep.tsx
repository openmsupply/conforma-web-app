import React from 'react'
import { Button, Container, Grid, Header, Segment } from 'semantic-ui-react'
import { TemplateElement } from '../../utils/generated/graphql'
import { ApplicationViewWrapper } from '../../elementPlugins'

interface ApplicationStepProps {
  sectionTitle: string
  elements: TemplateElement[]
  onNextClicked: (() => void) | null
  onPreviousClicked: (() => void) | null
}

const ApplicationStep: React.FC<ApplicationStepProps> = (props) => {
  const { sectionTitle, elements, onNextClicked, onPreviousClicked } = props

  return (
    <Container textAlign="left">
      <Segment>
        <Header content={sectionTitle} />
        {elements.map((element) => (
          <ApplicationViewWrapper
            key={`question_${element.code}`}
            initialValue={'Test'}
            templateElement={element}
            onUpdate={() => console.log('onUpdate called')}
            isVisible={true}
            isEditable={true}
          />
        ))}
        <Grid columns={3}>
          <Grid.Row>
            <Grid.Column>
              {onPreviousClicked && (
                <PageButton title="Previous" type="left" onClicked={onPreviousClicked} />
              )}
            </Grid.Column>
            <Grid.Column />
            {/* Empty cell */}
            <Grid.Column>
              {onNextClicked && <PageButton title="Next" type="right" onClicked={onNextClicked} />}
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </Segment>
    </Container>
  )
}

type ButtonDirection = 'left' | 'right'

interface PageButtonProps {
  title: string
  type: ButtonDirection
  onClicked: () => void
}

const PageButton: React.FC<PageButtonProps> = (props) => {
  const { title, type, onClicked } = props
  return (
    <Button
      labelPosition={type}
      icon={type === 'right' ? 'right arrow' : 'left arrow'}
      content={title}
      onClick={() => onClicked()}
    />
  )
}

export default ApplicationStep
