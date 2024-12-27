/**
 * Provides a mechanism to track the result of multiple sequential actions (e.g.
 * confirmation modals). Normally, in React, you can't await the result of a
 * confirmation modal as you have to pass in an `onConfirm` callback, which
 * can't return its result to the original calling component. When you have more
 * than one modal in sequence, particularly if there's branching logic based on
 * the result of those modals, you can quickly end up in Callback hell.
 *
 * There are solutions to create a promise-based hook that allows you to await
 * the result of a confirmation, e.g.
 * https://daveteu.medium.com/react-custom-confirmation-box-458cceba3f7b
 *
 * However, the solution offered here is a simpler option which just allows you
 * to specify a sequence of actions (a "workflow") and pass the state along from
 * one to the next. The actions themselves are responsible for calling the
 * `nextStep()` method and checking conditions.
 *
 * See `useTemplateOperations` to see how this hook is used.
 */

import { useRef } from 'react'

export type WorkflowStep = (...params: unknown[]) => void | Promise<void>

export const useMultiStep = <T>(defaultState: T) => {
  const workflow = useRef<WorkflowStep[]>([])
  const state: React.MutableRefObject<T | null> = useRef(defaultState)
  const step = useRef(-1)

  const setWorkflow = (steps: WorkflowStep[], initialState?: T) => {
    if (initialState) state.current = initialState
    workflow.current = steps
    // console.log('New workflow:', workflow.current)
    step.current = -1
  }

  const nextStep = () => {
    step.current++
    // console.log('Now running step', step.current)
    const method = workflow.current[step.current]
    method(state.current)
  }

  const hasNext = () => {
    return step.current < workflow.current.length - 1
  }

  const setWorkflowState = (newState: T) => {
    state.current = newState
  }

  return {
    setWorkflow,
    nextStep,
    hasNext,
    workflowState: state.current,
    setWorkflowState,
  }
}
