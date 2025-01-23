import { useState } from 'react'
import { ApplicationResponseStatus, useUpdateApplicationMutation } from '../generated/graphql'
import { FullStructure, UseGetApplicationProps } from '../types'

const useSubmitApplication = ({ serialNumber }: UseGetApplicationProps) => {
  const [error, setError] = useState('')

  const [applicationSubmitMutation] = useUpdateApplicationMutation({
    onError: (submissionError) => setError(submissionError.message),
    refetchQueries: ['getApplication'],
  })

  const submit = async (structure: FullStructure) => {
    const elements = Object.values(structure.elementsById || {}).filter(
      (element) => !!element.latestApplicationResponse?.id
    )
    const responsesPatch = elements.map(({ latestApplicationResponse }) => {
      return {
        id: latestApplicationResponse.id,
        patch: {
          // Don't update values, as it can sometimes make the mutation payload too large:
          // value: latestApplicationResponse.value || null,
          status: ApplicationResponseStatus.Submitted,
        },
      }
    })

    const result = await applicationSubmitMutation({
      variables: {
        serial: serialNumber,
        responses: responsesPatch,
      },
    })
    if (result.errors) throw new Error(result.errors.toString())
    return result
  }

  return {
    error,
    submit,
  }
}

export default useSubmitApplication
