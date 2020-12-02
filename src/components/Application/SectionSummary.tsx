import React from 'react'
import { Link } from 'react-router-dom'
import { Button, Header, Segment } from 'semantic-ui-react'
import { SummaryViewWrapper } from '../../formElementPlugins'
import { TemplateElementCategory } from '../../utils/generated/graphql'
import { ResponsesByCode, SectionElementStates } from '../../utils/types'

interface SectionSummaryProps {
  sectionPages: SectionElementStates
  serialNumber: string
  isDraft: boolean
  allResponses: ResponsesByCode
}

const SectionSummary: React.FC<SectionSummaryProps> = ({
  sectionPages,
  serialNumber,
  isDraft,
  allResponses,
}) => {
  const { section, pages } = sectionPages
  return (
    <Segment.Group size="large">
      <Header as="h2" content={`${section.title}`} />
      {Object.entries(pages).map(([pageName, elements]) => (
        <Segment>
          <p>{pageName}</p>
          <Segment.Group>
            {elements.map(({ element, response }) => {
              const { category, isVisible, isEditable } = element
              const pageCode = pageName?.replace(' ', '')
              return (
                <Segment>
                  <SummaryViewWrapper
                    element={element}
                    response={response}
                    allResponses={allResponses}
                  />
                  {category === TemplateElementCategory.Question &&
                    isVisible &&
                    isEditable &&
                    isDraft && (
                      <Button
                        size="small"
                        as={Link}
                        to={`/applications/${serialNumber}/${section.code}/${pageCode}`}
                      >
                        Edit
                      </Button>
                    )}
                </Segment>
              )
            })}
          </Segment.Group>
        </Segment>
      ))}
    </Segment.Group>
  )
}

export default SectionSummary
