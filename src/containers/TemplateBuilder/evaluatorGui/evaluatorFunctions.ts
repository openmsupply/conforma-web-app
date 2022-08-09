// This file should be identical to the back-end "evaluatorFunctions.ts". It
// allows us to preview the "objectFunctions" operator in the Template Builder
// Actions config

import { DateTime, Duration } from 'luxon'

const generateExpiry = (duration: Duration) => DateTime.now().plus(duration).toJSDate()

// getYear() => "2022"
// getYear("short") => "22"
const getYear = (type?: 'short'): string =>
  type === 'short' ? String(new Date().getFullYear()).slice(2) : String(new Date().getFullYear())

// Returns ISO date string as formatted Date (Luxon). Returns current date if
// date not supplied
const getFormattedDate = (formatString: string, date?: string) =>
  (date ? DateTime.fromISO(date) : DateTime.now()).toFormat(formatString)

export default { generateExpiry, getYear, getFormattedDate }