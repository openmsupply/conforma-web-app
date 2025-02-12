import React from 'react'
import useUndo from 'use-undo'
import Markdown from '../../utils/helpers/semanticReactMarkdown'
import { FigTreeEditor, FigTreeEditorProps } from 'fig-tree-editor-react'
import { isFigTreeError, truncateString, dequal, EvaluatorNode } from 'fig-tree-evaluator'
import { Position, topMiddle, useToast } from '../../contexts/Toast'
import { Icon } from 'semantic-ui-react'
import { useLanguageProvider } from '../../contexts/Localisation'

const RESULT_STRING_CHAR_LIMIT = 500

interface EvaluatorProps extends Omit<FigTreeEditorProps, 'onEvaluate'> {
  toastPosition?: Position
  canEdit: boolean
}

export const EvaluationEditor: React.FC<EvaluatorProps> = ({
  expression,
  setExpression,
  figTree,
  objectData,
  toastPosition = topMiddle,
  canEdit,
  ...figTreeEditorProps
}) => {
  const { t } = useLanguageProvider()
  const [{ present: currentData }, { set: setData, reset, undo, redo, canUndo, canRedo }] =
    useUndo(expression)
  const { showToast } = useToast({ position: toastPosition })

  const handleUpdate = (newData: EvaluatorNode) => {
    // This somewhat clunky bit of logic handles the fact that when FigTree
    // expressions are loaded from the database, the keys are often in an
    // undesirable order (alphabetical, which puts "children" before
    // "operator"). The FigTree Editor's internal "validate" function handles
    // this, and puts the keys in a better order for presentation, but it adds
    // an item to the Undo queue in doing so. By distinguishing between "strict"
    // and "loose" equality, we can update the state *without* adding to the
    // queue by using the "reset" method rather than "setData" in this case.

    // Strict => key order must be the same
    const isStrictlyEqual = JSON.stringify(newData) === JSON.stringify(currentData)
    // Loose => key order not considered
    const isLooselyEqual = dequal(newData, currentData)

    if (isLooselyEqual && !isStrictlyEqual) {
      reset(newData)
      return
    }

    if (isStrictlyEqual) return

    setExpression(newData)
    setData(newData)
  }

  return (
    <div className="fig-tree-container">
      <FigTreeEditor
        {...figTreeEditorProps}
        expression={currentData}
        setExpression={handleUpdate}
        figTree={figTree}
        objectData={objectData as Record<string, unknown>}
        restrictEdit={!canEdit}
        restrictAdd={!canEdit}
        restrictDelete={!canEdit}
        rootName=""
        // rootFontSize="14px"
        collapse={3}
        minWidth={600}
        collapseAnimationTime={0}
        onEvaluate={(result) =>
          showToast({
            text: truncateString(String(result)),
            html: formatResult(result),
            style: 'success',
            timeout: 10_000,
            maxWidth: 650,
          })
        }
        onEvaluateError={(err) => {
          showToast({
            title: 'Evaluation Error',
            text: isFigTreeError(err)
              ? truncateString(err.prettyPrint, 150)
              : (err as Error).message,
            style: 'negative',
            timeout: 10_000,
            maxWidth: 650,
          })
        }}
      />
      <div className="flex-row-space-between">
        <p className={`clickable nav-button ${!canUndo ? 'invisible' : ''}`}>
          <a onClick={undo}>
            <Icon name="arrow alternate circle left" />
            <strong>{t('BUTTON_UNDO')}</strong>
          </a>
        </p>
        <p className={`clickable nav-button ${!canRedo ? 'invisible' : ''}`}>
          <a onClick={redo}>
            <strong>{t('BUTTON_REDO')}</strong>
            <Icon name="arrow alternate circle right" />
          </a>
        </p>
      </div>
    </div>
  )
}

const formatResult = (result: unknown) => {
  switch (typeof result) {
    case 'boolean':
    case 'number':
      return undefined
    case 'object':
      if (result === null)
        return (
          <code>
            <strong>NULL</strong>
          </code>
        )
      return <pre>{truncateString(JSON.stringify(result, null, 2), RESULT_STRING_CHAR_LIMIT)}</pre>
    default:
      return <Markdown text={truncateString(String(result), RESULT_STRING_CHAR_LIMIT)} />
  }
}
