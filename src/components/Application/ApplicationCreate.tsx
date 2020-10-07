import React from 'react'
import { Button, Container, Header, Label, List, Segment } from 'semantic-ui-react'
import { Link } from 'react-router-dom'

interface Section {
  code: string
  title: string
  elementsCount: number
}

interface Template {
  description: string
  name: string
}

export interface ApplicationCreateProps {
  type: Template | null
  sections: Section[] | null
  handleOnClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
}

const ApplicationCreate: React.FC<ApplicationCreateProps> = (props) => {
  const { type, sections, handleOnClick } = props

  return (
    <Container text>
      <Header as="h1" content={type ? type.description : 'Create application page'} />
      {type && (
        <Segment>
          {sections && (
            <Header as="h2" content={`Number of sections in template: ${sections.length}`} />
          )}
          <List>
            {sections &&
              sections.map((section) => (
                <List.Item key={`list-item-${section.code}`} content={section.title} />
              ))}
          </List>
          <Button content={type.name} onClick={handleOnClick} />
        </Segment>
      )}
      {!type && <Label content="No Application" />}
    </Container>
  )
}

export default ApplicationCreate
