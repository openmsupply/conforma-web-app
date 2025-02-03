import React, { useState } from 'react'
import { Accordion, Button, Header, Icon } from 'semantic-ui-react'
import { FullStructure } from '../../../utils/types'
import { useActionState } from '../template/Actions/Actions'
import CheckboxIO from './CheckboxIO'
import TextIO from '../shared/TextIO'
import Evaluation from './Evaluation'
import JsonIO from './JsonIO'
import { EvaluatorNode } from 'fig-tree-evaluator'

export type ParametersType = {
  [key: string]: EvaluatorNode
}
type ParametersProps = {
  parameters: ParametersType
  currentElementCode: string
  setParameters: (parameters: ParametersType) => void
  canEdit: boolean
  fullStructure?: FullStructure
  requiredParameters?: string[]
  optionalParameters?: string[]
  type?: 'FormElement' | 'Action'
}

export const Parameters: React.FC<ParametersProps> = ({
  parameters,
  setParameters,
  canEdit,
  currentElementCode,
  fullStructure,
  requiredParameters,
  optionalParameters,
  type,
}) => {
  const { applicationData } = useActionState()
  const [asGui, setAsGui] = useState(true)
  const [isActive, setIsActive] = useState(false)

  return (
    <Accordion
      className="evaluation-container config-container-alternate"
      style={{ minWidth: 450 }}
    >
      <Accordion.Title
        className="evaluation-container-title"
        active={isActive}
        onClick={() => setIsActive(!isActive)}
      >
        <Header
          as="h4"
          className="no-margin-no-padding"
          content={`Plugin Specific Parameters (${Object.keys(parameters).length})`}
        />
        <div className="flex-row-end">
          <Icon size="large" name={isActive ? 'angle up' : 'angle down'} />
        </div>
      </Accordion.Title>
      {isActive && (
        <Accordion.Content className="evaluation-container-content" active={isActive}>
          <>
            <div className="flex-column-start-center">
              {(requiredParameters || optionalParameters) && (
                <div className="flex-row-start-center-wrap" style={{ maxWidth: 600 }}>
                  <TextIO
                    title="Required Parameters"
                    text={
                      requiredParameters && requiredParameters.length > 0
                        ? JSON.stringify(requiredParameters, null, 2)
                        : '<none>'
                    }
                    labelNegative
                  />
                  <TextIO
                    title="Optional Parameters"
                    isTextArea={true}
                    text={
                      optionalParameters && optionalParameters.length > 0
                        ? JSON.stringify(optionalParameters, null, 2)
                        : '<none>'
                    }
                    labelNegative
                  />
                </div>
              )}
              <div className="config-container-outline">
                <div className="flex-row flex-gap-20">
                  <CheckboxIO title="Show As GUI" value={asGui} setValue={setAsGui} />
                  <div className="spacer-10" />
                  {asGui && (
                    <Button
                      primary
                      inverted
                      disabled={!canEdit}
                      onClick={() => {
                        setParameters({ ...parameters, newParameter: null })
                      }}
                    >
                      Add Parameter
                    </Button>
                  )}
                </div>
                {!asGui && (
                  <div className="long">
                    <JsonIO
                      isPropUpdated={true}
                      object={parameters}
                      label=""
                      setObject={(value) => setParameters(value as ParametersType)}
                    />
                  </div>
                )}
              </div>

              {asGui &&
                Object.entries(parameters).map(([key, value]) => (
                  <Evaluation
                    setEvaluation={(value: any) => setParameters({ ...parameters, [key]: value })}
                    updateKey={(newKey) => {
                      const newParameters = { ...parameters }
                      delete newParameters[key]
                      newKey && setParameters({ ...newParameters, [newKey]: value })
                    }}
                    deleteKey={
                      canEdit
                        ? () => {
                            const newParameters = { ...parameters }
                            delete newParameters[key]
                            setParameters(newParameters)
                          }
                        : undefined
                    }
                    key={key}
                    evaluation={value}
                    fullStructure={fullStructure}
                    applicationData={applicationData}
                    type={type}
                    currentElementCode={currentElementCode}
                    label={key}
                    canEdit={canEdit}
                  />
                ))}
            </div>
          </>
        </Accordion.Content>
      )}
    </Accordion>
  )
}
