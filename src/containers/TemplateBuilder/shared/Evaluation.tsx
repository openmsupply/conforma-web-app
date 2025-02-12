import React, { useState } from 'react'
import { JsonEditor as ReactJson } from 'json-edit-react'
import { Accordion, Icon, Label } from 'semantic-ui-react'
import { useUserState } from '../../../contexts/UserState'
import { FullStructure } from '../../../utils/types'
import TextIO from './TextIO'
import { EvaluatorNode, truncateString } from 'fig-tree-evaluator'
import { FigTree } from '../../../FigTreeEvaluator'
import { getFigTreeSummary } from '../../../FigTreeEvaluator/FigTree'
import { EvaluationEditor } from '../../../components/common/EvaluationEditor'
import { useLanguageProvider } from '../../../contexts/Localisation'
import { Position, useToast } from '../../../contexts/Toast'

type EvaluationProps = {
  evaluation: EvaluatorNode
  currentElementCode: string
  setEvaluation: (evaluation: EvaluatorNode) => void
  fullStructure?: FullStructure // for Form Elements
  applicationData?: any // for Actions
  label: string
  updateKey?: (key: string) => void
  deleteKey?: () => void
  type?: 'FormElement' | 'Action'
  canEdit: boolean
}

type EvaluationHeaderProps = {
  evaluation: EvaluatorNode
}

export const EvaluationHeader: React.FC<EvaluationHeaderProps> = ({ evaluation }) => {
  const figTreeSummary = getFigTreeSummary(evaluation)

  return (
    <div className="flex-row-start-center" style={{ marginTop: 6 }}>
      <TextIO title="Type" text={figTreeSummary.type} />
      {figTreeSummary.type === 'Operator' && (
        <TextIO title="Operator" text={figTreeSummary.operator} />
      )}
      {figTreeSummary.type === 'Fragment' && (
        <TextIO title="Fragment" text={figTreeSummary.fragment} />
      )}
      {'value' in figTreeSummary && <TextIO title="Value" text={figTreeSummary.value} />}
    </div>
  )
}

const Evaluation: React.FC<EvaluationProps> = ({
  evaluation,
  setEvaluation,
  label,
  currentElementCode,
  fullStructure,
  applicationData,
  updateKey,
  deleteKey,
  type,
  canEdit,
}) => {
  const { t } = useLanguageProvider()
  const { showToast } = useToast()
  const {
    userState: { currentUser },
  } = useUserState()
  const [isActive, setIsActive] = useState(false)
  const data =
    type === 'Action'
      ? { applicationData }
      : type === 'FormElement'
      ? {
          responses: {
            ...fullStructure?.responsesByCode,
            thisResponse: fullStructure?.responsesByCode?.[currentElementCode]?.text,
          },
          currentUser,
          applicationData: { ...fullStructure?.info, currentPageType: 'application' },
        }
      : undefined

  return (
    <Accordion className="evaluation-container">
      <Accordion.Title className="evaluation-container-title flex-gap-10" active={isActive}>
        {!updateKey && label && (
          <Label style={{ minWidth: 120, textAlign: 'center' }}>{label}</Label>
        )}
        {deleteKey && (
          <Icon
            className="clickable left-margin-space-10"
            name="window close"
            onClick={deleteKey}
          />
        )}
        {updateKey && (
          <div className="flex-row-start-center" style={{ marginTop: 6 }}>
            <TextIO
              title="Parameter Name"
              text={label}
              setText={updateKey as (key: string | null) => void}
            />
          </div>
        )}
        <EvaluationHeader evaluation={evaluation} />
        <div className="flex-row-end">
          <Icon
            size="large"
            name={isActive ? 'angle up' : 'angle down'}
            onClick={() => setIsActive(!isActive)}
          />
        </div>
      </Accordion.Title>
      {isActive && (
        <Accordion.Content className="evaluation-container-content" active={isActive}>
          <div className="flex-row-space-between" style={{ gap: '1.5em' }}>
            <EvaluationEditor
              expression={evaluation}
              setExpression={setEvaluation}
              figTree={FigTree}
              objectData={data as Record<string, unknown>}
              canEdit={canEdit}
            />
            {data && (
              <div className="object-properties-container">
                <ReactJson
                  data={data}
                  rootName="data"
                  collapse={1}
                  indent={2}
                  maxWidth={450}
                  restrictEdit={true}
                  restrictDelete={true}
                  restrictAdd={true}
                  theme={{ container: ['transparent', { fontSize: '13px', padding: 0 }] }}
                  enableClipboard={({ key, value, type, stringValue }) => {
                    const text =
                      typeof value === 'object' && value !== null
                        ? t('CLIPBOARD_COPIED_ITEMS', {
                            name: key,
                            count: Object.keys(value).length,
                          })
                        : truncateString(stringValue)
                    showToast({
                      title: t(
                        type === 'value' ? 'CLIPBOARD_COPIED_VALUE' : 'CLIPBOARD_COPIED_PATH'
                      ),
                      text,
                      style: 'info',
                      position: Position.bottomLeft,
                    })
                  }}
                />
              </div>
            )}
          </div>
        </Accordion.Content>
      )}
    </Accordion>
  )
}

export default Evaluation
