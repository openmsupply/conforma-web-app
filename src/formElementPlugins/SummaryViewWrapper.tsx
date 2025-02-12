import React, { useEffect, useState } from 'react'
import { ErrorBoundary } from '.'
import { PluginProvider } from './pluginProvider'
import { Form } from 'semantic-ui-react'
import { SummaryViewWrapperProps, PluginComponents } from './types'
import { FigTree } from '../FigTreeEvaluator'
import { ResponseFull } from '../utils/types'
import { buildParameters } from './ApplicationViewWrapper'
import { useUserState } from '../contexts/UserState'
import Markdown from '../utils/helpers/semanticReactMarkdown'
import { TemplateElementCategory } from '../utils/generated/graphql'
import { EvaluatorNode } from 'fig-tree-evaluator'

const SummaryViewWrapper: React.FC<SummaryViewWrapperProps> = ({
  element,
  response,
  allResponses,
  applicationData = {},
  displayTitle = true,
}) => {
  const { parameters, pluginCode, isRequired, isVisible } = element
  const {
    userState: { currentUser },
  } = useUserState()
  const [evaluatedParameters, setEvaluatedParameters] = useState({})

  const plugin = PluginProvider?.[pluginCode]

  const { SummaryView, config }: PluginComponents = plugin

  const parameterLoadingValues = config?.parameterLoadingValues
  const internalParameters = config?.internalParameters || []
  const [simpleParameters, parameterExpressions] = buildParameters(
    parameters,
    parameterLoadingValues,
    internalParameters
  )

  useEffect(() => {
    // Update dynamic parameters when responses change, but only if there's no
    // saved evaluations (usually INFORMATION type), or "showLiveParameters" has
    // been explicitly set
    if (simpleParameters?.showLiveParameters || !response?.evaluatedParameters) {
      Object.entries(parameterExpressions).forEach(([field, expression]) => {
        FigTree.evaluate(expression as EvaluatorNode, {
          data: {
            responses: { ...allResponses, thisResponse: response?.text },
            currentUser,
            applicationData,
          },
        }).then((result: any) =>
          setEvaluatedParameters((prevState) => ({ ...prevState, [field]: result }))
        )
      })
    }
  }, [allResponses])

  if (!pluginCode || !isVisible || !plugin) return null

  const DefaultSummaryView: React.FC = () => {
    const combinedParams = getCombinedParams(simpleParameters, evaluatedParameters, response)
    return (
      <Form.Field
        className="element-summary-view"
        required={isRequired && element.category !== TemplateElementCategory.Information}
      >
        {displayTitle && (
          <>
            <label style={{ color: 'black' }}>
              <Markdown text={combinedParams.label} semanticComponent="noParagraph" />
            </label>
            <Markdown text={combinedParams.description} />
          </>
        )}
        <Markdown text={(response ? response?.text : '') as string} />
      </Form.Field>
    )
  }

  const PluginComponent = (
    <SummaryView
      parameters={getCombinedParams(simpleParameters, evaluatedParameters, response)}
      response={response}
      Markdown={Markdown}
      DefaultSummaryView={DefaultSummaryView}
    />
  )

  return (
    <ErrorBoundary pluginCode={pluginCode}>
      <React.Suspense fallback="Loading Plugin">
        <Form.Field required={isRequired}>{PluginComponent}</Form.Field>
      </React.Suspense>
    </ErrorBoundary>
  )
}

const getCombinedParams = (
  simpleParams: Record<string, any>,
  evaluatedParams: Record<string, any>,
  response: ResponseFull | null
) => {
  const showLiveParameters =
    evaluatedParams?.showLiveParameters ?? simpleParams?.showLiveParameters ?? false

  // If "showLiveParameters" is true, we always show the current, dynamic values
  // of the parameters (which may change at any time) instead of being fixed at
  // what they were when the application was submitted

  return showLiveParameters
    ? { ...simpleParams, ...evaluatedParams }
    : { ...simpleParams, ...evaluatedParams, ...response?.evaluatedParameters }
}

export default SummaryViewWrapper
