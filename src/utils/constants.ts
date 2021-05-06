import { Decision } from './generated/graphql'

export default {
  ACTION_ASSIGN: 'Assign',
  ACTION_CONTINUE: 'Continue',
  ACTION_START: 'Start',
  ACTION_DATE_RE_SUBMITTED: 'Re-Submitted',
  ACTION_DATE_ASSIGNED: 'Assigned',
  ACTION_DATE_REVIEW_SUBMITTED: 'Review Submitted',
  ACTION_DATE_REVIEW_STARTED: 'Review Started',
  ACTION_RE_REVIEW: 'Re-review',
  ACTION_RE_ASSIGN: 'Re-Assign',
  ACTION_SELF_ASSIGN: 'Self-Assign',
  ACTION_UPDATE: 'Update',
  ACTION_VIEW: 'View',
  ASSIGNED: 'assigned',
  ASSIGNED_TO: 'assigned to',
  ASSIGNMENT_NOT_ASSIGNED: 'Not assigned',
  ASSIGNMENT_YOURSELF: 'Yourself',
  ASSIGNMENT_UNASSIGN: 'Un-assign',
  BUTTON_APPLICATION_NEW: 'New application',
  BUTTON_APPLICATION_RESUME: 'Resume',
  BUTTON_APPLICATION_START: 'Get started',
  BUTTON_APPLICATION_SUBMIT: 'Submit application',
  BUTTON_BACK_DASHBOARD: 'Back to dashboard',
  BUTTON_BACK_TO: 'Back to',
  BUTTON_CLEAR_SEARCH: 'Clear Search',
  BUTTON_NEXT: 'Next',
  BUTTON_PREVIOUS: 'Previous',
  BUTTON_REVIEW_APPROVE_ALL: 'Approve all ',
  BUTTON_REVIEW_RE_REVIEW: 'Re-Review',
  BUTTON_REVIEW_RESPONSE: 'Review',
  BUTTON_RE_REVIEW_RESPONSE: 'Re-Review',
  BUTTON_REVIEW_SUBMIT: 'Submit review',
  BUTTON_SELF_ASSIGN: 'Self Assign',
  BUTTON_SUMMARY: 'Review & Summary',
  BUTTON_SUBMIT: 'Submit',
  BUTTON_SUBMIT_APPLICATION: 'Submit application',
  BUTTON_SUMMARY_EDIT: 'Edit',
  PLACEHOLDER_SEARCH: 'Search Applications...',
  DATE_APPLICATION_PLACEHOLDER: '31/12/2020',
  ERROR_APPLICATION_CREATE: 'Problem loading application creation page',
  ERROR_APPLICATION_PAGE: 'Problem loading application',
  ERROR_APPLICATION_SUBMIT: 'Problem submitting application',
  ERROR_APPLICATIONS_LIST: 'Problem loading applications list',
  ERROR_GENERIC: 'Something went wrong',
  ERROR_REVIEW_PAGE: 'Problem loading review',
  ERROR_LOGIN_PASSWORD: 'Oops! Problem with username or password',
  LABEL_APPLICATIONS: 'applications',
  LABEL_APPLICATION_UPDATE: 'Update',
  LABEL_APPLICATION_SUBMITTED: 'Application Submitted',
  LABEL_APPLICATION_BACK: 'Back to form',
  LABEL_ASSIGNED_TO_YOU: 'Assigned to you',
  LABEL_ASSIGNED_TO_OTHER: 'Assigned to another reviewer',
  LABEL_ASSIGNMENT_LOCKED: 'Locked for',
  LABEL_ASSIGNMENT_SELF: 'Can be self assigned',
  LABEL_ASSIGNMENT_AVAILABLE: 'Can be self assigned by',
  LABEL_COMMENT: 'Add comment',
  LABEL_CONSOLIDATION_AGREED_CONFORM: 'Agreed with conformity',
  LABEL_CONSOLIDATION_AGREED_NON_CONFORM: 'Agreed with non-conformity',
  LABEL_CONSOLIDATION_DISAGREED_CONFORM: 'Disagreed with conformity',
  LABEL_CONSOLIDATION_DISAGREED_NON_CONFORM: 'Disagreed with non-conformity',
  LABEL_LIST_PER_PAGE: 'Applications per page',
  LABEL_LOADING: 'Loading...',
  LABEL_LOGIN_PASSWORD: 'Password',
  LABEL_LOGIN_USERNAME: 'Username',
  LABEL_LOG_IN: 'Log in',
  LABEL_LOG_OUT: 'Log out',
  LABEL_NO_ORG: 'Log in without organisation',
  LABEL_PROCESSING: 'Processing...',
  LABEL_REVIEW: 'Review',
  LABEL_REVIEW_APPROVE: 'Approve',
  LABEL_REVIEW_DECISION: 'Decision',
  LABEL_REVIEW_DECLINED: 'Declined',
  LABEL_REVIEW_DECICION_CONFORM: 'Conform',
  LABEL_REVIEW_DECISION_NON_CONFORM: 'Non conform',
  LABEL_REVIEW_OVERALL_COMMENT: 'Overall comment',
  LABEL_REVIEW_RESSUBMIT: 'Request a resubmission',
  LABEL_REVIEW_SECTION: 'Please complete the section',
  LABEL_REVIEW_SUBMIT_AS: 'Submit as',
  LABEL_REVIEWED_BY: 'Review by',
  LABEL_SECTION_PROBLEM: 'Errors',
  LABEL_SECTION_COMPLETED: 'Completed',
  LABEL_UPDATED: 'Updated',
  LINK_LOGIN_USER: 'Create new account',
  MENU_ITEM_DASHBOARD: 'Dashboard',
  TITLE_LOGIN_HEADER: 'IRIMS Application Manager',
  TITLE_LOGIN: 'Login',
  TITLE_APPLICATION_FORM: 'application form',
  TITLE_APPLICATION_SUMMARY: 'Review and Submit',
  TITLE_NO_ORGANISATION: 'No Organisation',
  TITLE_DETAILS: 'Details',
  TITLE_INTRODUCTION: 'Introduction',
  TITLE_REVIEW_COMMENT: 'Overall comment',
  TITLE_REVIEW_DECISION: 'Submitted decision',
  TITLE_REVIEW_SUMMARY: 'Review Summary',
  TITLE_STEPS: 'Steps to complete',
  STAGE_PLACEHOLDER: 'Assessment',
  STATUS_IN_PROGRESS: 'In progress',
  STATUS_NOT_STARTED: 'Not started',
  REVIEW_STARTED: 'Review started',
  REVIEW_SUBMITTED: 'Review submitted',
  REVIEW_FILTER_EVERYONE: 'Everyone',
  REVIEW_FILTER_YOURSELF: 'Yourself',
  REVIEW_FILTER_SHOW_TASKS_FOR: 'Show tasks for',
  REVIEW_FILTER_STAGE: 'Stage',
  SUBTITLE_APPLICATION_STEPS:
    'The following steps will need to be completed before the form can be submitted',
  SUBTITLE_APPLICATION_SUMMARY: 'Please review each section before submitting form',
  SUBTITLE_REVIEW: 'Please complete the sections that have been assigned to you',
  SUBTITLE_SUBMISSION_STEPS: 'It will be going through the following stages before approval',
  USER_NONREGISTERED: 'nonRegistered',
  VALIDATION_REQUIRED_ERROR: 'Field is required',
  [Decision.ListOfQuestions]: 'List Of Questions',
  [Decision.ChangesRequested]: 'Changes Requested',
  [Decision.Conform]: 'Conform',
  [Decision.NonConform]: 'Non Conform',
  [Decision.NoDecision]: '',
  DATE_TODAY: 'Today',
  DATE_YESTERDAY: 'Yesterday',
  DATE_DAYS_AGO: 'days ago',
  DATE_LAST_WEEK: 'Last Week',
  DATE_WEEKS_AGO: 'weeks ago',
  DATE_LAST_MONTH: 'Last Month',
  DATE_MONTHS_AGO: 'months ago',
  DATE_LAST_YEAR: 'Last Year',
  DATE_YEARS_AGO: 'years ago',
  FOOTER_TEXT: 'Powered by mSupply Application Manager',
  FOOTER_COPYRIGHT: '© 2020',
  PAGE_TITLE_HOME: 'Dashboard | Application Manager',
  PAGE_TITLE_LIST: 'Applications List |  Application Manager',
  PAGE_TITLE_CREATE: 'New Application | Application Manager',
  PAGE_TITLE_APPLICATION: 'Application %1 | Application Manager',
  PAGE_TITLE_REVIEW: 'Review %1 | Application Manager',
}
