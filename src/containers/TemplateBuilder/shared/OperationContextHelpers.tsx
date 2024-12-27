import {
  useUpdateTemplateMutation,
  useUpdateTemplateFilterJoinMutation,
  useUpdateTemplateSectionMutation,
  useDeleteWholeApplicationMutation,
  useRestartApplicationMutation,
  useUpdateTemplateStageMutation,
  useDeleteTemplateMutation,
} from '../../../utils/generated/graphql'
import useCreateApplication from '../../../utils/hooks/useCreateApplication'
import useGetApplicationSerial from '../../../utils/hooks/useGetApplicationSerial'
import {
  UpdateTemplate,
  UpdateTemplateFilterJoin,
  DeleteApplication,
  CreateApplication,
  ErrorAndLoadingState,
  UpdateApplication,
  UpdateTemplateStage,
  DeleteTemplate,
} from './OperationContext'

export type SetErrorAndLoadingState = (props: ErrorAndLoadingState) => void

type UpdateTemplateHelper = (
  setErrorAndLoadingState: SetErrorAndLoadingState,
  updateTemplateMutation: ReturnType<typeof useUpdateTemplateMutation>[0]
) => UpdateTemplate

type DeleteTemplateHelper = (
  setErrorAndLoadingState: SetErrorAndLoadingState,
  updateTemplateSectionMutation: ReturnType<typeof useDeleteTemplateMutation>[0]
) => DeleteTemplate

type UpdateTemplateFilterJoinHelper = (
  setErrorAndLoadingState: SetErrorAndLoadingState,
  updateTemplateMutation: ReturnType<typeof useUpdateTemplateFilterJoinMutation>[0]
) => UpdateTemplateFilterJoin

type UpdateTemplateSectionHelper = (
  setErrorAndLoadingState: SetErrorAndLoadingState,
  updateTemplateSectionMutation: ReturnType<typeof useUpdateTemplateSectionMutation>[0]
) => UpdateTemplateFilterJoin

type DeleteApplicationHelper = (
  setErrorAndLoadingState: SetErrorAndLoadingState,
  deleteApplicationMutation: ReturnType<typeof useDeleteWholeApplicationMutation>[0]
) => DeleteApplication

type CreateApplicationHelper = (
  setErrorAndLoadingState: SetErrorAndLoadingState,
  create: ReturnType<typeof useCreateApplication>['create'],
  getSerialAsync: ReturnType<typeof useGetApplicationSerial>['getSerialAsync']
) => CreateApplication

type UpdateApplicationHelper = (
  setErrorAndLoadingState: SetErrorAndLoadingState,
  create: ReturnType<typeof useRestartApplicationMutation>[0]
) => UpdateApplication

type UpdateTemplateStageHelper = (
  setErrorAndLoadingState: SetErrorAndLoadingState,
  updateTemplateStageMutation: ReturnType<typeof useUpdateTemplateStageMutation>[0]
) => UpdateTemplateStage

export const deleteTemplate: DeleteTemplateHelper =
  (setErrorAndLoadingState: SetErrorAndLoadingState, deleteTemplateMutation) => async (id) => {
    try {
      const result = await deleteTemplateMutation({
        variables: { id },
      })
      return checkMutationResult(result, setErrorAndLoadingState)
    } catch (e) {
      setErrorAndLoadingState({
        isLoading: false,
        error: { message: 'error', title: (e as Error).message },
      })
      return false
    }
  }

const checkMutationResult = async (
  result: any,
  setErrorAndLoadingState: SetErrorAndLoadingState
) => {
  if (result?.errors) {
    setErrorAndLoadingState({
      isLoading: false,
      error: {
        title: 'error',
        message: JSON.stringify(result.errors),
      },
    })
    return false
  }
  return true
}

export const updateTemplate: UpdateTemplateHelper =
  (setErrorAndLoadingState: SetErrorAndLoadingState, updateTemplateMutation) =>
  async (template, patch) => {
    try {
      const result = await updateTemplateMutation({
        variables: { id: template.id, templatePatch: patch },
      })
      return checkMutationResult(result, setErrorAndLoadingState)
    } catch (e) {
      setErrorAndLoadingState({
        isLoading: false,
        error: { message: 'error', title: (e as Error).message },
      })
      return false
    }
  }

export const updateTemplateFilterJoin: UpdateTemplateFilterJoinHelper =
  (setErrorAndLoadingState: SetErrorAndLoadingState, updateTemplateFilterJoin) =>
  async (id, patch) => {
    try {
      const result = await updateTemplateFilterJoin({ variables: { id, filterJoinPatch: patch } })
      return checkMutationResult(result, setErrorAndLoadingState)
    } catch (e) {
      setErrorAndLoadingState({
        isLoading: false,
        error: { message: 'error', title: (e as Error).message },
      })
      return false
    }
  }

export const updateTemplateSection: UpdateTemplateSectionHelper =
  (setErrorAndLoadingState: SetErrorAndLoadingState, updatateTemplateSectionMutation) =>
  async (id, patch) => {
    try {
      const result = await updatateTemplateSectionMutation({
        variables: { id, sectionPatch: patch },
      })
      return checkMutationResult(result, setErrorAndLoadingState)
    } catch (e) {
      setErrorAndLoadingState({
        isLoading: false,
        error: { message: 'error', title: (e as Error).message },
      })
      return false
    }
  }

export const updateApplication: UpdateApplicationHelper =
  (setErrorAndLoadingState: SetErrorAndLoadingState, updateApplicationMutation) =>
  async (serial, patch) => {
    try {
      const result = await updateApplicationMutation({
        variables: { serial, applicationPatch: patch },
      })
      return checkMutationResult(result, setErrorAndLoadingState)
    } catch (e) {
      setErrorAndLoadingState({
        isLoading: false,
        error: { message: 'error', title: (e as Error).message },
      })
      return false
    }
  }

export const updateTemplateStage: UpdateTemplateStageHelper =
  (setErrorAndLoadingState: SetErrorAndLoadingState, updateTemplateStageMutation) =>
  async (id, patch) => {
    try {
      const result = await updateTemplateStageMutation({
        variables: { id, templateStagePatch: patch },
      })
      return checkMutationResult(result, setErrorAndLoadingState)
    } catch (e) {
      setErrorAndLoadingState({
        isLoading: false,
        error: { message: 'error', title: (e as Error).message },
      })
      return false
    }
  }

export const deleteApplication: DeleteApplicationHelper =
  (setErrorAndLoadingState: SetErrorAndLoadingState, deleteApplicationMutation) => async (id) => {
    try {
      const result = await deleteApplicationMutation({
        variables: { id },
      })
      return checkMutationResult(result, setErrorAndLoadingState)
    } catch (e) {
      setErrorAndLoadingState({
        isLoading: false,
        error: { message: 'error', title: (e as Error).message },
      })
      return false
    }
  }

export const createApplication: CreateApplicationHelper =
  (setErrorAndLoadingState: SetErrorAndLoadingState, create, getSerialAsync) => async (props) => {
    try {
      const result = await create(props)
      if (!checkMutationResult) return false

      const serial = await getSerialAsync(result?.data?.createApplication?.application?.id || 0)
      if (serial) return true

      setErrorAndLoadingState({
        isLoading: false,
        error: { message: 'error', title: 'cannot get newly created application serial' },
      })
      return false
    } catch (e) {
      setErrorAndLoadingState({
        isLoading: false,
        error: { message: 'error', title: (e as Error).message },
      })
      return false
    }
  }

export const getRandomNumber = () => Math.floor(Math.random() * Math.pow(9, 9))
