import React, { useEffect, useState } from 'react'
import { Modal, Label, Icon, Header, Message } from 'semantic-ui-react'
import { PluginProvider } from '../../../../formElementPlugins/pluginProvider'
import {
  Reviewability,
  TemplateElement,
  TemplateElementCategory,
} from '../../../../utils/generated/graphql'
import ButtonWithFallback from '../../shared/ButtonWidthFallback'
import DropdownIO from '../../shared/DropdownIO'
import Evaluation from '../../shared/Evaluation'
import { useOperationState } from '../../shared/OperationContext'
import { ParametersType, Parameters } from '../../shared/Parameters'
import TextIO from '../../shared/TextIO'
import { disabledMessage, useTemplateState } from '../TemplateWrapper'
import { useFullApplicationState } from '../ApplicationWrapper'
import { useFormState } from './Form'
import FromExistingElement from './FromExistingElement'
import { useLanguageProvider } from '../../../../contexts/Localisation'
import useConfirmationModal from '../../../../utils/hooks/useConfirmationModal'
import { EvaluatorNode } from 'fig-tree-evaluator'

type ElementConfigProps = {
  element: TemplateElement | null
  onClose: () => void
}

type ElementUpdateState = {
  code: string
  title: string | null
  category: TemplateElementCategory
  elementTypePluginCode: string
  visibilityCondition: EvaluatorNode
  isRequired: EvaluatorNode
  isEditable: EvaluatorNode
  validation: EvaluatorNode
  validationMessage: string | null
  helpText: string | null
  parameters: ParametersType
  initialValue: EvaluatorNode
  reviewability: Reviewability | null
  id: number
}

type GetState = (element: TemplateElement) => ElementUpdateState

const getState: GetState = (element: TemplateElement) => ({
  code: element.code || '',
  title: element.title || null,
  category: element.category || TemplateElementCategory.Information,
  elementTypePluginCode: element.elementTypePluginCode || '',
  visibilityCondition: element.visibilityCondition,
  isRequired: element.isRequired,
  isEditable: element.isEditable,
  validation: element.validation,
  helpText: element.helpText || null,
  validationMessage: element.validationMessage || '',
  parameters: element.parameters || {},
  initialValue: element.initialValue || null,
  reviewability: element.reviewability || null,
  id: element.id,
})

type Evaluations = {
  key: keyof ElementUpdateState
  title: string
}[]

const evaluations: Evaluations = [
  { key: 'isEditable', title: 'Is Editable' },
  { key: 'isRequired', title: 'Is Required' },
  { key: 'validation', title: 'Is Valid' },
  { key: 'visibilityCondition', title: 'Is Visible' },
  { key: 'initialValue', title: 'Initial Value' },
]

const ElementConfig: React.FC<ElementConfigProps> = ({ element, onClose }) => {
  const { t } = useLanguageProvider()
  const { ConfirmModal: RemoveElementModal, showModal: showRemoveElementModal } =
    useConfirmationModal({
      title: t('TEMPLATE_MESSAGE_REMOVE_ELEMENT_TITLE'),
      message: t('TEMPLATE_MESSAGE_REMOVE_ELEMENT_CONTENT'),
      confirmText: t('BUTTON_CONFIRM'),
    })

  const { structure, reloadApplication } = useFullApplicationState()
  const {
    template: { canEdit },
  } = useTemplateState()
  const { selectedSectionId } = useFormState()
  const { updateApplication, updateTemplateSection } = useOperationState()
  const [state, setState] = useState<ElementUpdateState | null>(null)
  const [shouldUpdate, setShouldUpdate] = useState<boolean>(false)
  const [showSaveAlert, setShowSaveAlert] = useState<boolean>(false)
  const [open, setOpen] = useState(false) // TODO: Use ConfirmationModal (2 actions...)

  useEffect(() => {
    if (!element) return setState(null)
    setState(getState(element))
    setShowSaveAlert(false)
  }, [element])

  if (!state || !element) return null

  const removeElement = async () => {
    const applicationResponseId =
      structure?.elementsById?.[state.id]?.latestApplicationResponse?.id || null

    if (applicationResponseId) {
      const result = await updateApplication(structure.info.serial, {
        applicationResponsesUsingId: {
          deleteById: [{ id: applicationResponseId }],
        },
      })
      if (!result) return
    }

    const result = await updateTemplateSection(selectedSectionId, {
      templateElementsUsingId: {
        deleteById: [{ id: state.id }],
      },
    })
    reloadApplication()
    if (!result) return

    onClose()
  }

  const updateElement = async () => {
    const result = await updateTemplateSection(selectedSectionId, {
      templateElementsUsingId: {
        updateById: [{ id: state.id, patch: state }],
      },
    })
    setShouldUpdate(false)
    setShowSaveAlert(true)
    setTimeout(() => setShowSaveAlert(false), 2000)
    if (!result) return
  }

  const saveAndClose = () => {
    updateElement()
    onClose()
  }

  const markNeedsUpdate = () => {
    setShouldUpdate(true)
    setShowSaveAlert(false)
  }

  return (
    <Modal className="config-modal" open={true}>
      <div className="config-modal-container">
        <div className="config-modal-header">
          <Header as="h3">{state.title}</Header>
          <div className="flex-column">
            <DropdownIO
              title="Type"
              value={state.elementTypePluginCode}
              disabled={!canEdit}
              disabledMessage={disabledMessage}
              getKey={'code'}
              getValue={'code'}
              getText={'displayName'}
              setValue={(value) => {
                setState({ ...state, elementTypePluginCode: String(value) })
                markNeedsUpdate()
              }}
              options={Object.values(PluginProvider).map((element) => element.config)}
              search
              labelNegative
              minLabelWidth={50}
            />
            {canEdit && (
              <FromExistingElement
                pluginCode={state.elementTypePluginCode}
                setTemplateElement={(existingElement) => {
                  setState({ ...state, ...existingElement })
                  markNeedsUpdate()
                }}
              />
            )}
          </div>
        </div>
        <Label
          className="element-edit-info"
          attached="top right"
          style={{ borderTopRightRadius: 8 }}
        >
          <a
            href="https://github.com/msupply-foundation/conforma-web-app/wiki/Element-Type-Specs"
            target="_blank"
          >
            <Icon name="info circle" size="big" color="blue" />
          </a>
        </Label>
        <div className="config-modal-info">
          {!canEdit && <Label color="red">Template form only editable on draft templates</Label>}
          <div className="spacer-10" />
          <div className="config-container-outline" style={{ maxWidth: 600 }}>
            <div className="flex-row-start-start">
              <div className="full-width-container">
                <TextIO
                  text={state?.title || ''}
                  title="Title"
                  setText={(text) => {
                    setState({ ...state, title: text })
                  }}
                  disabled={!canEdit}
                  disabledMessage={disabledMessage}
                  markNeedsUpdate={markNeedsUpdate}
                  isPropUpdated={true}
                  minLabelWidth={60}
                  maxLabelWidth={60}
                />
              </div>
            </div>
            <div className="flex-row-start-start">
              <TextIO
                text={state.code}
                title="Code"
                setText={(text) => {
                  setState({ ...state, code: text ?? '' })
                }}
                disabled={!canEdit}
                disabledMessage={disabledMessage}
                markNeedsUpdate={markNeedsUpdate}
                isPropUpdated={true}
                minLabelWidth={60}
                maxLabelWidth={60}
              />
              <DropdownIO
                title="Category"
                value={state.category}
                disabled={!canEdit}
                disabledMessage={disabledMessage}
                getKey={'category'}
                getValue={'category'}
                getText={'title'}
                isPropUpdated={true}
                setValue={(value) => {
                  setState({ ...state, category: value as TemplateElementCategory })
                  markNeedsUpdate()
                }}
                options={[
                  { category: TemplateElementCategory.Information, title: 'Information' },
                  { category: TemplateElementCategory.Question, title: 'Question' },
                ]}
              />
            </div>
            <div className="full-width-container">
              <DropdownIO
                title="Is Reviewable"
                value={state.reviewability || 'default'}
                disabled={!canEdit}
                disabledMessage={disabledMessage}
                getKey={'value'}
                getValue={'value'}
                getText={'text'}
                isPropUpdated={true}
                setValue={(value) => {
                  const updateValue = value === 'default' ? null : value
                  setState({ ...state, reviewability: updateValue as Reviewability })
                  markNeedsUpdate()
                }}
                options={[
                  { value: Reviewability.Always, text: 'Always' },
                  { value: Reviewability.Never, text: 'Never' },
                  {
                    value: Reviewability.OptionalIfNoResponse,
                    text: 'Optional (if no application response)',
                  },
                  {
                    value: Reviewability.OnlyIfApplicantAnswer,
                    text: 'Only if applicant answered',
                  },
                ]}
                maxLabelWidth={120}
              />
            </div>
            <div className="flex-row-start-center-wrap">
              <div className="full-width-container">
                <TextIO
                  text={state?.validationMessage || ''}
                  title="Validation Message"
                  disabled={!canEdit}
                  disabledMessage={disabledMessage}
                  isTextArea={true}
                  setText={(text) => {
                    setState({ ...state, validationMessage: text || null })
                  }}
                  markNeedsUpdate={markNeedsUpdate}
                  isPropUpdated={true}
                  minLabelWidth={100}
                  maxLabelWidth={100}
                  labelTextAlign="right"
                  textAreaDefaultRows={3}
                />
              </div>
            </div>
            <div className="flex-row-start-center-wrap">
              <div className="full-width-container">
                <TextIO
                  text={state?.helpText || ''}
                  isTextArea={true}
                  title="Help Text"
                  disabled={!canEdit}
                  disabledMessage={disabledMessage}
                  setText={(text) => {
                    setState({ ...state, helpText: text || null })
                  }}
                  markNeedsUpdate={markNeedsUpdate}
                  isPropUpdated={true}
                  minLabelWidth={100}
                  maxLabelWidth={100}
                  labelTextAlign="right"
                />
              </div>
            </div>
          </div>
          <div className="spacer-10" />
          <div className="config-container-alternate">
            <Header as="h4">Common Properties</Header>
            {evaluations.map(({ key, title }) => (
              <Evaluation
                label={title}
                key={key}
                currentElementCode={state.code}
                fullStructure={structure}
                evaluation={state[key]}
                setEvaluation={(evaluation) => {
                  setState({ ...state, [key]: evaluation })
                  markNeedsUpdate()
                }}
                type="FormElement"
                canEdit={canEdit}
              />
            ))}
          </div>
          <div className="spacer-10" />
          <Parameters
            key="parametersElement"
            currentElementCode={state.code}
            fullStructure={structure}
            parameters={state.parameters}
            setParameters={(parameters) => {
              setState({ ...state, parameters })
              markNeedsUpdate()
            }}
            canEdit={canEdit}
            type="FormElement"
          />
          <div className="spacer-20" />
          <div className="flex-row-center-center">
            <ButtonWithFallback
              title={t('BUTTON_SAVE')}
              disabled={!canEdit || !shouldUpdate}
              disabledMessage={!canEdit ? disabledMessage : t('TEMPLATE_MESSAGE_SAVE_DISABLED')}
              onClick={updateElement}
            />
            <ButtonWithFallback
              disabled={!canEdit}
              disabledMessage={disabledMessage}
              title={t('BUTTON_REMOVE')}
              onClick={() => showRemoveElementModal({ onConfirm: () => removeElement() })}
            />
            <ButtonWithFallback
              title={t('BUTTON_CLOSE')}
              onClick={() => (shouldUpdate && canEdit ? setOpen(true) : onClose())}
            />
            <Modal
              basic
              size="small"
              icon="save"
              header={t('TEMPLATE_MESSAGE_SAVE_AND_CLOSE')}
              open={open}
              onClose={() => setOpen(false)}
              actions={[
                {
                  key: 'save',
                  content: t('BUTTON_SAVE'),
                  positive: true,
                  onClick: saveAndClose,
                },
                {
                  key: 'close',
                  content: t('BUTTON_CLOSE'),
                  positive: false,
                  onClick: onClose,
                },
              ]}
            />
          </div>
        </div>
      </div>
      <RemoveElementModal />
      <Message
        className="alert-success"
        success
        icon={<Icon name="check circle outline" />}
        header={t('TEMPLATE_MESSAGE_SAVE_SUCCESS')}
        hidden={!showSaveAlert}
        onClick={() => setShowSaveAlert(false)}
      />
    </Modal>
  )
}

export default ElementConfig
