import React, { useEffect, useState } from 'react'
import { Form } from 'semantic-ui-react'
import { ApplicationViewProps } from '../../types'
import strings from '../constants'

export enum NumberType {
  INTEGER = 'integer',
  FLOAT = 'float',
}

const ApplicationView: React.FC<ApplicationViewProps> = ({
  element,
  parameters,
  onUpdate,
  setIsActive,
  validationState,
  onSave,
  Markdown,
  currentResponse,
}) => {
  const [textValue, setTextValue] = useState<string | null | undefined>(currentResponse?.text)
  const [internalValidation, setInternalValidation] = useState(validationState)
  const { isEditable } = element
  const {
    placeholder,
    label,
    description,
    maxWidth,
    type = NumberType.FLOAT,
    minValue = -Infinity,
    maxValue = Infinity,
    locale = undefined,
    currency = undefined,
    prefix = '',
    suffix = '',
    maxSignificantDigits = undefined,
  } = parameters

  const formatOptions = {
    style: currency ? 'currency' : undefined,
    currency: currency ?? undefined,
    maximumSignificantDigits: maxSignificantDigits,
  }
  const numberFormatter = new Intl.NumberFormat(locale, formatOptions)

  function handleChange(e: any) {
    const text = e.target.value
    const [number, _] = parseInput(text, numberFormatter)
    setInternalValidation(customValidate(number, type, minValue, maxValue))
    onUpdate(text)
    setTextValue(text)
  }

  function handleLoseFocus(e: any) {
    const [number, newText] = parseInput(textValue, numberFormatter)
    if (internalValidation.isValid) onSave({ text: newText, number, type, currency, locale })
    else onSave(null)
    setTextValue(newText)
  }

  const styles = maxWidth
    ? {
        maxWidth,
      }
    : {}

  return (
    <>
      <label>
        <Markdown text={label} semanticComponent="noParagraph" />
      </label>
      <Markdown text={description} />
      <Form.Input
        fluid
        placeholder={placeholder}
        onChange={handleChange}
        onBlur={handleLoseFocus}
        onFocus={setIsActive}
        value={textValue ? textValue : ''}
        disabled={!isEditable}
        style={styles}
        error={
          !validationState.isValid || !internalValidation.isValid
            ? {
                content:
                  internalValidation?.validationMessage || validationState?.validationMessage,
                pointing: 'above',
              }
            : null
        }
      />
    </>
  )
}

const parseInput = (textInput: string | null | undefined, numberFormatter: any) => {
  if (textInput === '') return [null, null]
  const number: number = Number(textInput?.replace(/[^\d\.\-]/g, ''))
  return [number, numberFormatter.format(number)]
}

const customValidate = (
  number: number | null | undefined,
  type: NumberType,
  minValue: number = -Infinity,
  maxValue: number = Infinity
): { isValid: boolean; validationMessage?: string } => {
  if (type === NumberType.INTEGER && !Number.isInteger(number))
    return {
      isValid: false,
      validationMessage: strings.ERROR_NOT_INTEGER,
    }
  if ((number as number) < minValue)
    return {
      isValid: false,
      validationMessage: strings.ERROR_TOO_SMALL,
    }
  if ((number as number) > maxValue)
    return {
      isValid: false,
      validationMessage: strings.ERROR_TOO_BIG,
    }
  return { isValid: true }
}

export default ApplicationView
