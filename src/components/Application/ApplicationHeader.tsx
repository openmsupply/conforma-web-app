import React from 'react'
import { Link } from 'react-router-dom'
import { Container, Header, Icon, Label } from 'semantic-ui-react'
import strings from '../../utils/constants'
import { TemplateDetails, User } from '../../utils/types'

export interface AppHeaderProps {
  template: TemplateDetails
  currentUser: User | null
  ChildComponent: React.FC
}

const ApplicationHeader: React.FC<AppHeaderProps> = ({ template, currentUser, ChildComponent }) => {
  const { code, name } = template
  return (
    <Container id="application-area">
      <div className="top-container">
        <Label
          icon
          size="medium"
          as={Link}
          to={`/applications?type=${code}`}
          content={
            <>
              <Icon name="angle left" />
              {`${name} ${strings.LABEL_APPLICATIONS}`}
            </>
          }
        />
        <Header as="h4" className="company-title" textAlign="center">
          {currentUser?.organisation?.orgName || strings.TITLE_NO_ORGANISATION}
        </Header>
      </div>
      <Container id="application-content">
        <Header as="h2" textAlign="center">
          {`${name} ${strings.TITLE_APPLICATION_FORM}`}
          <Header.Subheader as="h3" content={strings.TITLE_INTRODUCTION} />
        </Header>
        <ChildComponent />
      </Container>
    </Container>
  )
}

export default ApplicationHeader
