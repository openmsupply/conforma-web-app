import React from 'react'
import useUndo from 'use-undo'
import Markdown from '../../utils/helpers/semanticReactMarkdown'
import { FigTreeEditor, FigTreeEditorProps } from 'fig-tree-editor-react'
import { EvaluatorNode, isFigTreeError, truncateString } from 'fig-tree-evaluator'
import { Position, topMiddle, useToast } from '../../contexts/Toast'
import { Button, Icon } from 'semantic-ui-react'
import { useLanguageProvider } from '../../contexts/Localisation'

const RESULT_STRING_CHAR_LIMIT = 500

interface EvaluatorProps extends Omit<FigTreeEditorProps, 'onEvaluate'> {
  toastPosition?: Position
}

export const EvaluationEditor: React.FC<EvaluatorProps> = ({
  expression,
  setExpression,
  figTree,
  objectData,
  toastPosition = topMiddle,
  restrictEdit,
  ...figTreeEditorProps
}) => {
  const { t } = useLanguageProvider()
  const [{ present: currentData }, { set: setData, reset, undo, redo, canUndo, canRedo }] =
    useUndo(expression)
  const { showToast } = useToast({ position: toastPosition })

  return (
    <div className="fig-tree-container">
      <FigTreeEditor
        {...figTreeEditorProps}
        expression={currentData}
        setExpression={(data) => {
          if (JSON.stringify(data) !== JSON.stringify(expression)) setData(data)
        }}
        figTree={figTree}
        objectData={objectData as Record<string, unknown>}
        restrictEdit={restrictEdit}
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
        // enableClipboard={handleCopy}
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
        <Button
          primary
          // disabled={!isDirty}
          // loading={isSaving}
          content={t('BUTTON_SAVE')}
          // onClick={handleSave}
        />
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
