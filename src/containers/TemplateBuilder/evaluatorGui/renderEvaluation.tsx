import figTree, { EvaluatorOutput } from '../../../components/FigTreeEvaluator'
import React, { useState } from 'react'
import { Header, Icon, Modal } from 'semantic-ui-react'
import { Loading } from '../../../components'
import { guis } from './guiDefinitions'
import Markdown from '../../../utils/helpers/semanticReactMarkdown'
import {
  convertTypedEvaluationToBaseType,
  getTypedEvaluation,
  getTypedEvaluationAsString,
} from './typeHelpers'
import { EvaluationType, ParseAndRenderEvaluationType, RenderEvaluationElementType } from './types'
import EvaluationOutputType from './EvaluationOutputType'
import EvaluationFallback from './EvaluationFallback'

export const renderEvaluation: ParseAndRenderEvaluationType = (
  evaluation,
  setEvaluation,
  ComponentLibrary,
  data
) => {
  const _setEvaluation = (typedEvaluation: EvaluationType) =>
    setEvaluation(convertTypedEvaluationToBaseType(typedEvaluation))

  return renderEvaluationElement(evaluation, _setEvaluation, ComponentLibrary, data)
}

const Evaluate: React.FC<{
  typedEvaluation: EvaluationType
  data?: { [key: string]: any }
}> = ({ typedEvaluation, data }) => {
  const [evaluationResult, setEvaluationResult] = useState<EvaluatorOutput | undefined | null>(
    undefined
  )

  const evaluateNode = async () => {
    try {
      const result = await figTree.evaluate(convertTypedEvaluationToBaseType(typedEvaluation), {
        data,
      })
      setEvaluationResult(result)
    } catch (e) {
      setEvaluationResult('Problem Executing Evaluation')
    }
  }

  return (
    <>
      <Icon
        className="clickable"
        name="play"
        size="large"
        onClick={() => evaluateNode()}
        style={{ marginBottom: 8 }}
      />
      <Modal
        className="config-modal"
        open={evaluationResult !== undefined}
        onClose={() => setEvaluationResult(undefined)}
      >
        <div className="config-modal-container ">
          <Header>Evaluation Result</Header>
          {evaluationResult === undefined && <Loading />}
          {evaluationResult !== undefined && (
            <pre>{JSON.stringify(evaluationResult, null, ' ')}</pre>
          )}
          {typeof evaluationResult === 'string' && (
            <>
              <Header as="h4">Markdown</Header>
              <Markdown text={evaluationResult} />
            </>
          )}
        </div>
      </Modal>
    </>
  )
}

export const renderEvaluationElement: RenderEvaluationElementType = (
  evaluation,
  setEvaluation,
  ComponentLibrary,
  data
) => {
  const typedEvaluation = getTypedEvaluation(evaluation)
  const gui = guis.find(({ match }) => match(typedEvaluation))
  const selections = guis.map(({ selector }) => selector)
  const onSelect = (selected: string) => {
    const selectedGui = guis.find(({ selector }) => selector === selected)
    if (selectedGui) setEvaluation(selectedGui.default)
  }
  try {
    if (gui) {
      return (
        <ComponentLibrary.FlexRow>
          <ComponentLibrary.Step />
          <ComponentLibrary.OperatorContainer>
            <ComponentLibrary.FlexRow>
              <ComponentLibrary.Selector
                selections={selections}
                selected={gui.selector}
                setSelected={onSelect}
                title="operator"
              />
              <Evaluate typedEvaluation={typedEvaluation} data={data} />
            </ComponentLibrary.FlexRow>
            <EvaluationOutputType evaluation={typedEvaluation} setEvaluation={setEvaluation} />
            <EvaluationFallback evaluation={typedEvaluation} setEvaluation={setEvaluation} />
            {gui.render(typedEvaluation, setEvaluation, ComponentLibrary, data)}
          </ComponentLibrary.OperatorContainer>
        </ComponentLibrary.FlexRow>
      )
    }
  } catch (e) {
    return <ComponentLibrary.Error error={'problem rendering element'} info={e.toString()} />
  }
  return (
    <ComponentLibrary.Error
      error={'operator not found'}
      info={getTypedEvaluationAsString(evaluation)}
    />
  )
}
