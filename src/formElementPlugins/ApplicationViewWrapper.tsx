import React, { useEffect, useState } from 'react'
import { ErrorBoundary } from '.'
import { PluginProvider } from './pluginProvider'
import { ApplicationViewWrapperProps, ValidationState } from './types'
import { useUpdateResponseMutation } from '../utils/generated/graphql'
import { LooseString, ResponseFull, ElementPluginParameters } from '../utils/types'
import { useUserState } from '../contexts/UserState'
import validate from './defaultValidate'
import { FigTree } from '../FigTreeEvaluator'
import { isEqual } from 'lodash-es'
import { Form, Icon } from 'semantic-ui-react'
import Markdown from '../utils/helpers/semanticReactMarkdown'
import { useFormElementUpdateTracker } from '../contexts/FormElementUpdateTrackerState'
import { useLanguageProvider } from '../contexts/Localisation'
import { SemanticICONS } from 'semantic-ui-react'
import { isFigTreeExpression } from '../FigTreeEvaluator/FigTree'
import { EvaluatorNode, FigTreeOptions } from 'fig-tree-evaluator'

export const DEFAULT_LOADING_VALUE = 'Loading...'

const ApplicationViewWrapper: React.FC<ApplicationViewWrapperProps> = (props) => {
  const { t } = useLanguageProvider()
  const calculateValidationState = useCalculateValidationState()
  const [responseMutation] = useUpdateResponseMutation()
  const { element, isStrictPage, changesRequired, currentResponse, allResponses, applicationData } =
    props

  const {
    code,
    pluginCode,
    parameters,
    isVisible,
    isRequired,
    validationExpression,
    validationMessage,
  } = element

  const isValid = currentResponse?.isValid || true

  const isInnerFormElement = !!props.onSaveUpdateMethod
  // Default update method is a mutation
  const onSaveUpdateMethod = props.onSaveUpdateMethod || responseMutation

  const stageNumber = applicationData.current.stage.number

  const { setState: setUpdateTrackerState } = useFormElementUpdateTracker()

  const {
    userState: { currentUser },
  } = useUserState()
  const [validationState, setValidationState] = useState<ValidationState>({
    isValid,
  })
  const [evaluatedParameters, setEvaluatedParameters] = useState<{ [key: string]: any }>({})

  const plugin = PluginProvider?.[pluginCode]

  const { ApplicationView, config } = plugin
  const parameterLoadingValues = config?.parameterLoadingValues
  const internalParameters = config?.internalParameters || []
  const [simpleParameters, parameterExpressions] = buildParameters(
    parameters,
    parameterLoadingValues,
    internalParameters
  )

  // Update dynamic parameters when responses change
  useEffect(() => {
    if (!isInnerFormElement)
      // Don't do this inside listBuilder or we get infinite loop
      setUpdateTrackerState({
        type: 'elementProcessing',
        elementCode: code,
      })

    const result = Object.entries(parameterExpressions).map(([field, expression]) => {
      return FigTree.evaluate(expression as EvaluatorNode, {
        data: { responses: allResponses, currentUser, applicationData },
      }).then((result: any) => {
        // Need to do our own equality check since React treats 'result' as
        // different object to original and causes a re-render even when not
        // really changed
        if (!isEqual(result, evaluatedParameters?.[field])) {
          setEvaluatedParameters((prevState) => ({ ...prevState, [field]: result }))
        }
      })
    })
    Promise.all(result).then(() => {
      if (!isInnerFormElement)
        setUpdateTrackerState({
          type: 'elementDoneProcessing',
          elementCode: code,
        })
    })
  }, [allResponses])

  useEffect(() => {
    onUpdate(currentResponse?.text)
  }, [currentResponse, isStrictPage])

  if (!plugin) return null

  const onUpdate = async (value: LooseString) => {
    const responses = { thisResponse: value, ...allResponses }
    const newValidationState = await calculateValidationState({
      validationExpression,
      validationMessage,
      isRequired,
      isStrictPage,
      responses,
      evaluationParameters: {
        data: { responses, currentUser, applicationData },
      },
      currentResponse,
    })
    setValidationState(newValidationState)
    return newValidationState
  }

  const onSave = async (response: ResponseFull) => {
    if (!isInnerFormElement)
      setUpdateTrackerState({
        type: 'elementProcessing',
        elementCode: code,
      })
    if (!response?.customValidation) {
      // Validate and Save response -- generic
      const validationResult: ValidationState = await onUpdate(response?.text)
      if (response?.text !== undefined)
        await onSaveUpdateMethod({
          variables: {
            id: currentResponse?.id as number,
            value: response,
            isValid: validationResult.isValid,
            stageNumber,
            evaluatedParameters: { ...simpleParameters, ...evaluatedParameters },
          },
        })
      if (response === null || response?.text == undefined)
        // Reset response if cleared
        await onSaveUpdateMethod({
          variables: {
            id: currentResponse?.id as number,
            value: null,
            isValid: null,
            stageNumber,
          },
        })
      notifyTrackerElementUpdated(response?.text)
    } else {
      // Save response for plugins with internal validation
      const { isValid, validationMessage } = response.customValidation
      setValidationState({ isValid, validationMessage })
      delete response.customValidation // Don't want to save this field
      await onSaveUpdateMethod({
        variables: {
          id: currentResponse?.id as number,
          value: response,
          isValid,
          stageNumber,
        },
      })
      notifyTrackerElementUpdated(response?.text)
    }
  }

  // Tells application state that plugin field was updated
  const notifyTrackerElementUpdated = (textValue?: string | null) => {
    // Avoid tracking changes for inner elements
    if (isInnerFormElement) return
    setUpdateTrackerState({
      type: 'setElementUpdated',
      elementCode: code,
      textValue: textValue || '',
      previousValue: currentResponse?.text || '',
    })
    setUpdateTrackerState({
      type: 'elementDoneProcessing',
      elementCode: code,
    })
  }

  // Tells application state that plugin field is in focus
  const notifyTrackerElementEntered = (textValue?: string | null) => {
    // Avoid tracking changes for inner elements
    if (isInnerFormElement) return
    setUpdateTrackerState({
      type: 'setElementEntered',
      elementCode: code,
      textValue: textValue || '',
    })
  }

  const setIsActive = () => {
    notifyTrackerElementEntered(currentResponse?.text)
  }

  if (!pluginCode || !isVisible) return null

  const PluginComponent = (
    <ApplicationView
      onUpdate={onUpdate}
      onSave={onSave}
      {...props}
      {...element}
      parameters={{ ...simpleParameters, ...evaluatedParameters }}
      setIsActive={setIsActive}
      Markdown={Markdown}
      validationState={validationState || { isValid: true }}
      validate={validate}
      getDefaultIndex={getDefaultIndex}
    />
  )

  const {
    isChangeRequest = false,
    isChanged = false,
    reviewerComment = t('APPLICATION_OTHER_CHANGES_MADE'),
  } = changesRequired || {}

  const getChangeRequestClassesAndIcon = () => {
    const isValid = validationState ? (validationState.isValid as boolean) : true
    if (!isValid) return
    if (isChangeRequest && isChanged)
      return {
        extraClasses: 'changes change-request-changed',
        iconName: 'comment alternate outline',
      }
    if (isChangeRequest && !isChanged)
      return { extraClasses: 'changes change-request-unchanged', iconName: 'exclamation circle' }
    // Updated without change request
    if (isChanged) return { extraClasses: 'changes updated', iconName: 'info circle' }
    return
  }

  const { extraClasses = '', iconName = '' } = getChangeRequestClassesAndIcon() || {}

  return (
    <ErrorBoundary pluginCode={pluginCode}>
      <React.Suspense fallback="Loading Plugin">
        <Form.Field className={`element-application-view ${extraClasses}`} required={isRequired}>
          {PluginComponent}
          {element.helpText && (
            <div className="help-tips-content hide-on-desktop">
              <Markdown text={element.helpText} />
            </div>
          )}
          <ChangesComment reviewerComment={reviewerComment} iconName={iconName} />
        </Form.Field>
      </React.Suspense>
    </ErrorBoundary>
  )
}

interface ChangesCommentProps {
  reviewerComment: string
  iconName: string
}

const ChangesComment: React.FC<ChangesCommentProps> = ({ reviewerComment, iconName }) => (
  <>
    {/* reviewer-comment is only visibility when parent class matches ".element-application-view.changes" */}
    <p className="reviewer-comment">
      <Icon name={iconName as SemanticICONS} />
      {reviewerComment}
    </p>
  </>
)

export default ApplicationViewWrapper

/* 
Allows the default value in template to be either an index or string
value. Number is assumed to be index, else it returns the index of the 
specified value in the options array. Functions is passed as prop to
element plug-ins so can be used by any plugin.
*/
const getDefaultIndex = (defaultOption: string | number, options: string[]): number => {
  if (typeof defaultOption === 'number') {
    return defaultOption
  } else return options.indexOf(defaultOption)
}

export const buildParameters = (
  parameters: ElementPluginParameters,
  parameterLoadingValues: any,
  internalParameters: string[]
) => {
  const simpleParameters: any = {}
  const parameterExpressions: any = {}
  for (const [key, value] of Object.entries(parameters)) {
    if (internalParameters.includes(key)) simpleParameters[key] = value
    else if (isFigTreeExpression(value)) {
      parameterExpressions[key] = value
      simpleParameters[key] = parameterLoadingValues?.[key] ?? DEFAULT_LOADING_VALUE
    } else simpleParameters[key] = value
  }
  return [simpleParameters, parameterExpressions]
}

const useCalculateValidationState = () => {
  const { t } = useLanguageProvider()

  const calculateValidationState = async ({
    validationExpression,
    validationMessage,
    isRequired,
    isStrictPage,
    responses,
    evaluationParameters,
    currentResponse,
  }: {
    validationExpression: EvaluatorNode | undefined
    validationMessage: string | null | undefined
    isRequired: boolean | undefined
    isStrictPage: boolean | undefined
    responses: any // thisResponse field makes it not "ResponsesByCode"
    evaluationParameters: FigTreeOptions
    currentResponse: ResponseFull | null
  }) => {
    const validationResult = validationExpression
      ? await validate(validationExpression, validationMessage as string, evaluationParameters)
      : { isValid: true }

    if (!validationResult.isValid && currentResponse?.text !== undefined) return validationResult
    // !responses.thisResponse, check for null, undefined, empty string
    if (isRequired && isStrictPage && !responses?.thisResponse)
      return {
        isValid: false,
        validationMessage: validationMessage || t('VALIDATION_REQUIRED_ERROR'),
      }
    return { isValid: true }
  }

  return calculateValidationState
}
