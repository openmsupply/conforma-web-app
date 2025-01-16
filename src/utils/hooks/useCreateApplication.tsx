import { ApolloError } from '@apollo/client'
import { useState } from 'react'
import { useUserState } from '../../contexts/UserState'
import { useCreateApplicationMutation } from '../../utils/generated/graphql'
import { useRouter } from './useRouter'

export interface CreateApplicationProps {
  name: string
  templateId: number
  isConfig?: boolean
  templateResponses: { templateElementId: number; value: any }[]
  urlProperties?: Record<string, string | number | boolean>
}

const useCreateApplication = () => {
  const [error, setError] = useState<ApolloError | undefined>()
  const {
    userState: { currentUser },
  } = useUserState()
  const [applicationMutation] = useCreateApplicationMutation({
    onError: (error) => {
      setError(error)
    },
  })
  const { query } = useRouter()
  const { type, ...urlProperties } = query

  const createApplication = async ({
    name,
    templateId,
    templateResponses,
    isConfig = false,
  }: CreateApplicationProps) => {
    const mutationResult = await applicationMutation({
      variables: {
        isConfig,
        name,
        templateId,
        userId: currentUser?.userId,
        orgId: currentUser?.organisation?.orgId,
        sessionId: currentUser?.sessionId as string,
        responses: templateResponses,
        urlProperties,
      },
    })
    return mutationResult
  }

  return {
    error,
    create: createApplication,
  }
}

export default useCreateApplication
