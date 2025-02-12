import { EvaluatorNode, FigTreeOptions } from 'fig-tree-evaluator'
import { FigTree } from '../FigTreeEvaluator'
import { ValidationState } from './types'

const defaultValidate = async (
  validationExpress: EvaluatorNode,
  validationMessage: string,
  evaluatorParameters: FigTreeOptions
): Promise<ValidationState> => {
  if (
    !validationExpress ||
    (evaluatorParameters?.data as any)?.responses.thisResponse === undefined
  )
    return { isValid: true }
  const isValid = (await FigTree.evaluate(validationExpress, evaluatorParameters)) as boolean
  if (isValid) return { isValid }
  return { isValid, validationMessage }
}

export default defaultValidate
