import React from 'react'
import { Header, Container } from 'semantic-ui-react'
import Markdown from '../../utils/helpers/semanticReactMarkdown'
import { useLanguageProvider } from '../../contexts/Localisation'

interface ApplicationHomeWrapperProps {
  startMessage?: string
  name: string
  title: string
  subtitle?: string
  ButtonSegment?: React.FC
  children: React.ReactNode
}

const ApplicationHomeWrapper: React.FC<ApplicationHomeWrapperProps> = ({
  startMessage,
  name,
  title,
  subtitle,
  ButtonSegment,
  children,
}) => {
  const { t } = useLanguageProvider()
  return (
    <>
      <Container id="application-home-content" className="white-container-decoration">
        <Header as="h2" textAlign="center">
          {`${name} ${t('TITLE_APPLICATION_FORM')}`}
          <Header.Subheader content={title} />
        </Header>
        {subtitle && <p>{subtitle}</p>}
        <Header as="h4" className="steps-header" content={t('TITLE_STEPS')} />
        {children}
        {startMessage && <Markdown text={startMessage || ''} semanticComponent="Message" info />}
        {ButtonSegment && <ButtonSegment />}
      </Container>
    </>
  )
}

export default ApplicationHomeWrapper
