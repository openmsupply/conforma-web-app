import { useEffect, useState } from 'react'
import {
  GetReviewAssignmentQuery,
  Review,
  ReviewAssignment,
  ReviewQuestionAssignment,
  ReviewResponse,
  ReviewStatus,
  useGetReviewAssignmentQuery,
  User,
} from '../generated/graphql'
import useLoadSectionsStructure from '../../utils/hooks/useLoadSectionsStructure'
import { AssignmentDetails, SectionDetails, SectionsStructure, User as UserType } from '../types'
import getAssignedQuestions from '../helpers/review/getAssignedQuestions'
import { useUserState } from '../../contexts/UserState'
import updateSectionsReviews from '../helpers/review/updateSectionsReviews'

interface UseGetReviewAssignmentProps {
  reviewerId: number
  serialNumber: string
}

const useGetReviewAssignment = ({ reviewerId, serialNumber }: UseGetReviewAssignmentProps) => {
  const [assignment, setAssignment] = useState<AssignmentDetails>()
  const [sectionsAssigned, setSectionsAssigned] = useState<SectionsStructure>()
  const [assignmentError, setAssignmentError] = useState<string>()
  const {
    userState: { currentUser },
  } = useUserState()

  const {
    error: applicationError,
    loading: applicationLoading,
    application,
    sectionsStructure,
    isApplicationReady,
  } = useLoadSectionsStructure({
    serialNumber: serialNumber as string,
    currentUser: currentUser as UserType,
    networkFetch: true,
  })

  const { data, loading: apolloLoading, error: apolloError } = useGetReviewAssignmentQuery({
    variables: {
      reviewerId,
      applicationId: application?.id,
      stageId: application?.stage?.id,
    },
    skip: !isApplicationReady,
  })

  const getReview = (
    data: GetReviewAssignmentQuery | undefined
  ): { review?: Review; currentAssignment: ReviewAssignment } | undefined => {
    const reviewerAssignments = data?.reviewAssignments?.nodes as ReviewAssignment[]

    // Should have only 1 review assignment per applicaton, stage and reviewer
    if (reviewerAssignments.length === 0) {
      setAssignmentError('No assignments in this review')
      return undefined
    }

    const currentAssignment = reviewerAssignments[0]
    const reviews = currentAssignment.reviews.nodes as Review[]

    // Should have only 1 review per application, stage and reviewer
    const review = reviews.length > 0 ? reviews[0] : undefined

    return {
      review,
      currentAssignment,
    }
  }

  useEffect(() => {
    if (data && data.reviewAssignments) {
      const foundReview = getReview(data)
      if (!foundReview) return
      const { review, currentAssignment } = foundReview
      const reviewQuestions = currentAssignment.reviewQuestionAssignments
        .nodes as ReviewQuestionAssignment[]

      setAssignment({
        id: currentAssignment.id,
        review: review ? { id: review.id, status: review.status as ReviewStatus } : undefined,
        questions: getAssignedQuestions({ reviewQuestions }),
      })

      if (sectionsStructure && review) {
        const reviewResponses = review.reviewResponses.nodes as ReviewResponse[]
        const reviewer = currentAssignment.reviewer as User
        const sectionsWithReviews = updateSectionsReviews({
          sectionsStructure,
          reviewResponses,
          reviewer,
        })
        setSectionsAssigned(sectionsWithReviews)
      }
    }
  }, [data, sectionsStructure])

  return {
    error: apolloError ? (apolloError.message as string) : applicationError || assignmentError,
    loading: applicationLoading || apolloLoading,
    application,
    assignment,
    sectionsAssigned,
  }
}

export default useGetReviewAssignment
