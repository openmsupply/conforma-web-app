import {
  ApplicationDetails,
  ElementState,
  EvaluationOptions,
  ResponsesByCode,
  User,
} from '../../../utils/types'
import { TemplateElement, TemplateElementCategory } from '../../../utils/generated/graphql'
import { FigTree } from '../../../FigTreeEvaluator'

import { evaluateElements } from '../../../utils/helpers/evaluateElements'
import { defaultEvaluatedElement } from '../../../utils/hooks/useLoadApplication'
import { ListItem } from './types'
import { substituteValues } from '../../../utils/helpers/utilityFunctions'
import { EvaluatorNode } from 'fig-tree-evaluator'

// Formatting and Text manipulation
export const getDefaultDisplayFormat = (inputFields: TemplateElement[]) => {
  const displayString = inputFields.reduce(
    (acc: string, { code, title }) => acc + `**${title}**: \${${code}}  \n`,
    ''
  )
  return { title: '', subtitle: '', description: displayString }
}

const getDefaultTextValue = (item: ListItem, inputFields: TemplateElement[]) => {
  const parts = inputFields.map((field) => `${field.title}: ${item[field.code]?.value?.text}`)
  return parts.join(', ')
}

export const createTextString = (
  listItems: ListItem[],
  inputFields: TemplateElement[],
  textFormat?: string
) => {
  const textStrings = listItems.map((item, index) =>
    textFormat ? substituteValues(textFormat, item, index) : getDefaultTextValue(item, inputFields)
  )
  return textStrings.join('\n')
}

export const buildDataArray = async (
  listItems: ListItem[],
  inputFields: TemplateElement[],
  evaluatorData: Record<string, unknown>,
  dataFormat?: string | EvaluatorNode
) => {
  if (typeof dataFormat === 'string' || dataFormat === undefined) {
    return listItems.map((item, index) =>
      dataFormat
        ? substituteValues(dataFormat, item, index)
        : getDefaultTextValue(item, inputFields)
    )
  }

  // dataFormat is a full evaluator expression
  const evaluatedItems = listItems.map((item) =>
    FigTree.evaluate(dataFormat, {
      data: { ...evaluatorData, item },
    })
  )
  return Promise.all(evaluatedItems)
}

// Data validation and state reset
export const resetCurrentResponses = (inputFields: TemplateElement[]) =>
  inputFields.reduce((acc, { code }) => ({ ...acc, [code]: { value: { text: undefined } } }), {})

export const anyInvalidItems = (currentInput: ListItem) =>
  Object.values(currentInput).some((response) => response.isValid === false)

export const anyIncompleteItems = (currentInput: ListItem, inputFields: TemplateElement[]) =>
  inputFields.some((field) => field?.isRequired !== false && !currentInput[field.code].value?.text)

export const anyErrorItems = (currentInput: ListItem, inputFields: TemplateElement[]) =>
  anyInvalidItems(currentInput) || anyIncompleteItems(currentInput, inputFields)

// Building elements
export const combineResponses = (
  allResponses: ResponsesByCode,
  currentInputResponses: ListItem
) => {
  const currentResponses = Object.entries(currentInputResponses).reduce(
    (responses, [code, value]) => ({ ...responses, [code]: value?.value }),
    {}
  )
  return { ...allResponses, ...currentResponses }
}

export const buildElements = async (
  fields: TemplateElement[],
  allResponses: ResponsesByCode,
  currentInputResponses: ListItem,
  currentUser: User,
  applicationData: ApplicationDetails
) => {
  const elements = fields.map((field, index) => ({
    ...defaultEvaluatedElement,
    id: index,
    code: field.code,
    pluginCode: field.elementTypePluginCode as string,
    category: field.category as TemplateElementCategory,
    title: field.title as string,
    parameters: field.parameters,
    validationExpression: field?.validation || true,
    validationMessage: field?.validationMessage || '',
    isVisibleExpression: field?.visibilityCondition ?? true,
    isEditableExpression: field?.isEditable ?? true,
    isRequiredExpression: field?.isRequired ?? true,
    // "Dummy" values, but required for element props:
    elementIndex: 0,
    isValid: undefined,
    page: 0,
    sectionIndex: 0,
    helpText: null,
    sectionCode: '0',
    reviewability: null,
  }))
  const evaluationOptions: EvaluationOptions = ['isEditable', 'isVisible', 'isRequired']
  const evaluationObjects = {
    responses: combineResponses(allResponses, currentInputResponses),
    currentUser,
    applicationData,
  }

  const evaluatedElements = await evaluateElements(elements, evaluationOptions, evaluationObjects)
  const outputElements: { [key: string]: ElementState } = {}
  for (let i = 0; i < elements.length; i++) {
    outputElements[elements[i].code] = { ...elements[i], ...evaluatedElements[i] }
  }
  return outputElements
}
