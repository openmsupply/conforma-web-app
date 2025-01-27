import { ApolloError } from '@apollo/client'
import { useState } from 'react'
import { useUserState } from '../../contexts/UserState'
import { useCreateApplicationMutation } from '../../utils/generated/graphql'
import { useRouter } from './useRouter'
import { ParsedUrlQuery } from '../types'

export interface CreateApplicationProps {
  name: string
  templateId: number
  isConfig?: boolean
  templateResponses: { templateElementId: number; value: any }[]
  urlProperties?: ParsedUrlQuery
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
  const { getParsedUrlQuery } = useRouter()
  const { type, ...urlProperties } = getParsedUrlQuery()

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
