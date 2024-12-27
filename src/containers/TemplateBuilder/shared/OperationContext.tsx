import React, { useState, useContext, createContext } from 'react'
import { Modal, Label, Icon, Loader } from 'semantic-ui-react'
import {
  ApplicationPatch,
  TemplateFilterJoinPatch,
  TemplatePatch,
  TemplateSectionPatch,
  TemplateStagePatch,
  useDeleteTemplateMutation,
  useDeleteWholeApplicationMutation,
  useRestartApplicationMutation,
  useUpdateTemplateFilterJoinMutation,
  useUpdateTemplateMutation,
  useUpdateTemplateSectionMutation,
  useUpdateTemplateStageMutation,
} from '../../../utils/generated/graphql'
import useCreateApplication, {
  CreateApplicationProps,
} from '../../../utils/hooks/useCreateApplication'
import useGetApplicationSerial from '../../../utils/hooks/useGetApplicationSerial'
import {
  updateTemplate,
  updateTemplateFilterJoin,
  updateTemplateSection,
  deleteApplication,
  createApplication,
  updateApplication,
  updateTemplateStage,
  deleteTemplate,
} from './OperationContextHelpers'
import { TemplateState } from '../template/TemplateWrapper'
import { ModalState, useTemplateOperations } from '../templateOperations/useTemplateOperations'
import { Template } from '../useGetTemplates'
import { ModifiedEntities } from '../templateOperations/EntitySelectModal'

type Error = { title: string; message: string }
export type ErrorAndLoadingState = {
  error?: Error
  isLoading: boolean
}

export type TemplateOptions = { resetVersion?: boolean; newCode?: string }

export type TemplatesOperationProps = {
  id: number
  snapshotName: string
  templates?: TemplateOptions
}
export type TemplatesOperation = (props: TemplatesOperationProps) => Promise<boolean>
export type ImportTemplate = (e: React.ChangeEvent<HTMLInputElement>, refetch: () => void) => any
export type UpdateTemplate = (template: TemplateState, patch: TemplatePatch) => Promise<boolean>
export type DeleteTemplate = (id: number) => Promise<boolean>
export type UpdateTemplateFilterJoin = (
  id: number,
  patch: TemplateFilterJoinPatch
) => Promise<boolean>
export type UpdateTemplateSection = (id: number, patch: TemplateSectionPatch) => Promise<boolean>
export type DeleteApplication = (id: number) => Promise<boolean>
export type CreateApplication = (props: CreateApplicationProps) => Promise<boolean>
export type UpdateApplication = (serial: string, patch: ApplicationPatch) => Promise<boolean>
export type UpdateTemplateStage = (id: number, patch: TemplateStagePatch) => Promise<boolean>

type OperationContextState = {
  fetch: (something: any) => any
  commitTemplate: (template: Template | TemplateState, refetch: () => void) => Promise<void>
  exportTemplate: (template: Template, refetch: () => void) => Promise<void>
  duplicateTemplate: (template: Template, refetch: () => void) => Promise<void>
  importTemplate: ImportTemplate
  getFullEntityDiff: (
    uid: string,
    type: keyof ModifiedEntities,
    name: string
  ) => Promise<{ incoming: Record<string, unknown>; current: Record<string, unknown> }>
  updateTemplate: UpdateTemplate
  deleteTemplate: DeleteTemplate
  updateTemplateFilterJoin: UpdateTemplateFilterJoin
  updateTemplateSection: UpdateTemplateSection
  deleteApplication: DeleteApplication
  createApplication: CreateApplication
  updateApplication: UpdateApplication
  updateTemplateStage: UpdateTemplateStage
  operationModalState: ModalState
}

const contextNotPresentError = () => {
  throw new Error('context not present')
}

const defaultOperationContext: OperationContextState = {
  fetch: contextNotPresentError,
  commitTemplate: contextNotPresentError,
  exportTemplate: contextNotPresentError,
  duplicateTemplate: contextNotPresentError,
  getFullEntityDiff: contextNotPresentError,
  importTemplate: contextNotPresentError,
  updateTemplate: contextNotPresentError,
  deleteTemplate: contextNotPresentError,
  updateTemplateFilterJoin: contextNotPresentError,
  updateTemplateSection: contextNotPresentError,
  deleteApplication: contextNotPresentError,
  createApplication: contextNotPresentError,
  updateApplication: contextNotPresentError,
  updateTemplateStage: contextNotPresentError,
  operationModalState: {
    type: 'commit',
    isOpen: true,
    onConfirm: async () => {},
    close: () => {},
  },
}

const Context = createContext(defaultOperationContext)

const OperationContext: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [updateTemplateMutation] = useUpdateTemplateMutation()
  const [updateTemplateFilterJoinMutation] = useUpdateTemplateFilterJoinMutation()
  const [updateTemplateSectionMutation] = useUpdateTemplateSectionMutation()
  const [deleteTemplateMutation] = useDeleteTemplateMutation()
  const [deleteApplicationMutation] = useDeleteWholeApplicationMutation()
  const [updateApplicationMutation] = useRestartApplicationMutation()
  const [updateTemplateStageMutation] = useUpdateTemplateStageMutation()
  const [innerState, setInnerState] = useState<ErrorAndLoadingState>({ isLoading: false })
  const {
    commitTemplate,
    duplicateTemplate,
    exportTemplate,
    importTemplate,
    modalState,
    getFullEntityDiff,
  } = useTemplateOperations(setInnerState)
  const { create } = useCreateApplication()
  const { getSerialAsync } = useGetApplicationSerial()
  const [contextState] = useState<Omit<OperationContextState, 'operationModalState'>>({
    fetch: () => {},
    commitTemplate,
    exportTemplate,
    getFullEntityDiff,
    duplicateTemplate,
    importTemplate: (e: React.ChangeEvent<HTMLInputElement>, refetch: () => void) =>
      importTemplate(e, refetch, setInnerState),
    updateTemplate: updateTemplate(setInnerState, updateTemplateMutation),
    updateTemplateFilterJoin: updateTemplateFilterJoin(
      setInnerState,
      updateTemplateFilterJoinMutation
    ),
    deleteTemplate: deleteTemplate(setInnerState, deleteTemplateMutation),
    updateTemplateSection: updateTemplateSection(setInnerState, updateTemplateSectionMutation),
    deleteApplication: deleteApplication(setInnerState, deleteApplicationMutation),
    createApplication: createApplication(setInnerState, create, getSerialAsync),
    updateApplication: updateApplication(setInnerState, updateApplicationMutation),
    updateTemplateStage: updateTemplateStage(setInnerState, updateTemplateStageMutation),
  })

  const { isLoading, error } = innerState
  const renderExtra = () => (
    <Modal open={!!isLoading || !!error} onClose={resetLoading}>
      {error ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Label size="large" color="red">
            {error.title}
            <Icon name="close" onClick={resetLoading} />
          </Label>
          <div style={{ margin: 20 }}>{error.message}</div>
        </div>
      ) : (
        <Loader active>Loading</Loader>
      )}
    </Modal>
  )

  const resetLoading = () => {
    setInnerState({ isLoading: false })
  }

  return (
    <Context.Provider value={{ ...contextState, operationModalState: modalState }}>
      {children}
      {renderExtra()}
    </Context.Provider>
  )
}

export default OperationContext
export const useOperationState = () => useContext(Context)
