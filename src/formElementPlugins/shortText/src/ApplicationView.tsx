import React, { useState } from 'react'
import { Form } from 'semantic-ui-react'
import { ApplicationViewProps } from '../../types'
import useDefault from '../../useDefault'

const ApplicationView: React.FC<ApplicationViewProps> = ({
  element,
  parameters,
  onUpdate,
  setIsActive,
  currentResponse,
  validationState,
  onSave,
  Markdown,
}) => {
  const [value, setValue] = useState<string | null | undefined>(currentResponse?.text)

  const { isEditable } = element
  const {
    placeholder,
    maskedInput,
    label,
    description,
    maxWidth,
    maxLength = Infinity,
    default: defaultValue,
  } = parameters

  useDefault({
    defaultValue,
    currentResponse,
    parameters,
    onChange: (defaultText: string) => {
      setValue(defaultText)
      onSave({ text: defaultText })
    },
  })

  function handleChange(e: any) {
    let text = e.target.value
    if (text.length > maxLength) {
      text = text.substring(0, maxLength)
    }
    onUpdate(text)
    setValue(text)
  }

  function handleLoseFocus() {
    onSave({ text: value ? value.trim() : value })
  }

  const styles = maxWidth
    ? {
        maxWidth,
      }
    : {}

  return (
    <>
      {label && (
        <label>
          <Markdown text={label} semanticComponent="noParagraph" />
        </label>
      )}
      <Markdown text={description} />
      <Form.Input
        fluid
        placeholder={placeholder}
        onChange={handleChange}
        onBlur={handleLoseFocus}
        onFocus={setIsActive}
        value={value ? value : ''}
        disabled={!isEditable}
        type={maskedInput ? 'password' : undefined}
        style={styles}
        error={
          !validationState.isValid
            ? {
                content: validationState?.validationMessage,
                pointing: 'above',
              }
            : null
        }
      />
    </>
  )
}

export default ApplicationView
