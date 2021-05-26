import React, { useEffect, useState } from 'react'
import { ErrorBoundary, pluginProvider } from '.'
import { ApplicationViewWrapperProps, PluginComponents, ValidationState } from './types'
import { useUpdateResponseMutation } from '../utils/generated/graphql'
import {
  EvaluatorNode,
  EvaluatorParameters,
  LooseString,
  ResponseFull,
  ElementPluginParameters,
} from '../utils/types'
import { useUserState } from '../contexts/UserState'
import validate from './defaultValidate'
import evaluateExpression from '@openmsupply/expression-evaluator'
import { Form, Icon, Loader } from 'semantic-ui-react'
import Markdown from '../utils/helpers/semanticReactMarkdown'
import strings from '../utils/constants'
import { useFormElementUpdateTracker } from '../contexts/FormElementUpdateTrackerState'
import messages from '../utils/messages'
import globalConfig from '../config.json'

const graphQLEndpoint = globalConfig.serverGraphQL

const ApplicationViewWrapper: React.FC<ApplicationViewWrapperProps> = (props) => {
  const [responseMutation] = useUpdateResponseMutation()
  const {
    element,
    isStrictPage,
    changesRequired,
    currentResponse,
    allResponses,
    applicationData,
    onSaveUpdateMethod = responseMutation,
  } = props

  const {
    code,
    pluginCode,
    parameters,
    isVisible,
    isEditable,
    isRequired,
    validationExpression,
    validationMessage,
  } = element

  const isValid = currentResponse?.isValid || true

  const { setState: setUpdateTrackerState } = useFormElementUpdateTracker()

  const {
    userState: { currentUser },
  } = useUserState()
  const [validationState, setValidationState] = useState<ValidationState>({
    isValid,
  })
  const [evaluatedParameters, setEvaluatedParameters] = useState({})

  const { ApplicationView, config }: PluginComponents = pluginProvider.getPluginElement(pluginCode)

  const parameterLoadingValues = config?.parameterLoadingValues
  const [simpleParameters, parameterExpressions] = buildParameters(
    parameters,
    parameterLoadingValues
  )

  // Update dynamic parameters when responses change
  useEffect(() => {
    Object.entries(parameterExpressions).forEach(([field, expression]) => {
      evaluateExpression(expression as EvaluatorNode, {
        objects: { responses: allResponses, currentUser, applicationData },
        APIfetch: fetch,
        graphQLConnection: { fetch: fetch.bind(window), endpoint: graphQLEndpoint },
      }).then((result: any) =>
        setEvaluatedParameters((prevState) => ({ ...prevState, [field]: result }))
      )
    })
  }, [allResponses])

  useEffect(() => {
    onUpdate(currentResponse?.text)
  }, [currentResponse, isStrictPage])

  const onUpdate = async (value: LooseString) => {
    const responses = { thisResponse: value, ...allResponses }
    const newValidationState = await calculateValidationState({
      validationExpression,
      validationMessage,
      isRequired,
      isStrictPage,
      responses,
      evaluationParameters: {
        objects: { responses, currentUser, applicationData },
        APIfetch: fetch,
        graphQLConnection: { fetch: fetch.bind(window), endpoint: graphQLEndpoint },
      },
      currentResponse,
    })
    setValidationState(newValidationState)
    return newValidationState
  }

  const onSave = async (jsonValue: ResponseFull) => {
    if (!jsonValue?.customValidation) {
      // Validate and Save response -- generic
      const validationResult: ValidationState = await onUpdate(jsonValue?.text)
      if (jsonValue?.text !== undefined)
        await onSaveUpdateMethod({
          variables: {
            id: currentResponse?.id as number,
            value: jsonValue,
            isValid: validationResult.isValid,
          },
        })
      if (jsonValue === null)
        // Reset response if cleared
        await onSaveUpdateMethod({
          variables: {
            id: currentResponse?.id as number,
            value: null,
            isValid: null,
          },
        })
      setUpdateTrackerState({
        type: 'setElementUpdated',
        textValue: jsonValue?.text || '',
      })
    } else {
      // Save response for plugins with internal validation
      const { isValid, validationMessage } = jsonValue.customValidation
      setValidationState({ isValid, validationMessage })
      delete jsonValue.customValidation // Don't want to save this field
      await onSaveUpdateMethod({
        variables: {
          id: currentResponse?.id as number,
          value: jsonValue,
          isValid,
        },
      })
      setUpdateTrackerState({
        type: 'setElementUpdated',
        textValue: jsonValue?.text || '',
      })
    }
  }

  const setIsActive = () => {
    // Tells application state that a plugin field is in focus
    setUpdateTrackerState({
      type: 'setElementEntered',
      textValue: currentResponse?.text || '',
    })
  }

  if (!pluginCode || !isVisible) return null

  const PluginComponent = (
    <ApplicationView
      onUpdate={onUpdate}
      onSave={onSave}
      initialValue={currentResponse}
      {...props}
      {...element}
      parameters={{ ...simpleParameters, ...evaluatedParameters }}
      parameterExpressions={parameters}
      setIsActive={setIsActive}
      Markdown={Markdown}
      validationState={validationState || { isValid: true }}
      validate={validate}
      getDefaultIndex={getDefaultIndex}
    />
  )

  const getResponseAndBorder = () => {
    if (!changesRequired) return null
    const { isChangeRequest, isChanged } = changesRequired
    const isValid = validationState ? (validationState.isValid as boolean) : true
    const borderClass = isChangeRequest || (isChanged && isValid) ? 'element-warning-border' : ''
    const borderColorClass = isChangeRequest ? (!isChanged ? 'alert-border' : '') : 'blue-border'

    return (
      <>
        <Form.Field
          className={`element-application-view ${borderClass} ${borderColorClass}`}
          required={isRequired}
        >
          {PluginComponent}
          <ChangesToResponseWarning {...changesRequired} isValid={isValid} />
        </Form.Field>
        : <Loader active inline />
      </>
    )
  }

  return (
    <ErrorBoundary pluginCode={pluginCode}>
      <React.Suspense fallback="Loading Plugin">
        {changesRequired ? (
          getResponseAndBorder()
        ) : (
          <Form.Field className="element-application-view" required={isRequired}>
            {PluginComponent}
          </Form.Field>
        )}
      </React.Suspense>
    </ErrorBoundary>
  )
}

interface ChangesToResponseWarningProps {
  isChangeRequest: boolean
  isChanged: boolean
  reviewerComment: string
  isValid: boolean
}

const ChangesToResponseWarning: React.FC<ChangesToResponseWarningProps> = ({
  isChangeRequest,
  isChanged,
  reviewerComment,
  isValid,
}) => {
  const visibilityClass = isChangeRequest || (isChanged && isValid) ? '' : 'invisible'
  const colourClass = isChangeRequest ? (!isChanged ? 'alert' : '') : 'interactive-color'
  const iconSelection = isChangeRequest
    ? isChanged
      ? 'comment alternate outline'
      : 'exclamation circle'
    : 'info circle'
  return (
    <p className={`${colourClass} ${visibilityClass} reviewer-comment`}>
      <Icon name={iconSelection} className="colourClass" />
      {isChangeRequest ? reviewerComment : messages.APPLICATION_OTHER_CHANGES_MADE}
    </p>
  )
}

export default ApplicationViewWrapper

/* 
Allows the default value in template to be either an index or string
value. Number is assumed to be index, else it returns the index of the 
specified value in the options array. Functions is passed as prop to
element plug-ins so can be used by any plugin.
*/
const getDefaultIndex = (defaultOption: string | number, options: string[]) => {
  if (typeof defaultOption === 'number') {
    return defaultOption
  } else return options.indexOf(defaultOption)
}

export const buildParameters = (
  parameters: ElementPluginParameters,
  parameterLoadingValues: any
) => {
  const simpleParameters: any = {}
  const parameterExpressions: any = {}
  for (const [key, value] of Object.entries(parameters)) {
    if (value instanceof Object && !Array.isArray(value) && 'operator' in value) {
      parameterExpressions[key] = value
      simpleParameters[key] = parameterLoadingValues?.[key] ?? 'Loading...'
    } else simpleParameters[key] = value
  }
  return [simpleParameters, parameterExpressions]
}

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
  evaluationParameters: EvaluatorParameters
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
      validationMessage: validationMessage || strings.VALIDATION_REQUIRED_ERROR,
    }
  return { isValid: true }
}
