import { get as extractObjectProperty } from 'lodash-es'

export const isArraySorted = (array: any[], ascending = true) => {
  if (ascending) return array.every((element, index) => index === 0 || element >= array[index - 1])
  else
    return array.every(
      (element, index) => index === array.length - 1 || element >= array[index + 1]
    )
}

export const isObject = (element: unknown) =>
  typeof element === 'object' && !Array.isArray(element) && element !== null

/*
Checks if a URL string is an external URL or a local/relative one
If local/relative, it prepends it with a specified host, else it
returns it unchanged.
*/
export const getFullUrl = (baseUrl: string | undefined, host: string) => {
  return baseUrl?.startsWith('http') ? baseUrl : host + baseUrl
}

/*
Replaces substrings identified as ${"property"} with values from "data".
"property" can be a nested object property e.g "user.name".
Note: If substring contains no property name (i.e. '${}') and "data" is not an
Object, the whole item will be inserted.
Also, if the extracted property is an object, we'll try [property].value.text
(which makes the substitutions simpler in many form elements)
If an "index" value is passed in, that can be accessed by '${0}'
*/
export const substituteValues = (
  parameterisedString: string,
  data: { [key: string]: any | string },
  index?: number
): string => {
  // Custom replacement function for regex replace
  const getObjectProperty = (_: string, __: string, property: string) => {
    if (property === '0' && index !== undefined) return String(index + 1)
    if (typeof data !== 'object') return data
    let value = extractObjectProperty(data, property, `Can't find property: ${property}`)
    if (isObject(value))
      value = extractObjectProperty(
        data,
        `${property}.value.text`,
        `Can't find property: ${property}`
      )
    return value ?? ''
  }

  // Match ${...} using regex and replace ... with property from object
  return parameterisedString.replace(/(\${)(.*?)(})/gm, getObjectProperty)
}

/*
 We are using ',' as a delimiter for url queries with multiple values. This
 means that values with *actual* commas in them get messed up. These functions
 can be used to remove commas before updating url query, then re-inserting them
 after extraction from url query
*/

// Use anything obscure than doesn't have special meaning in urls or regex
const MAGIC_STRING = '~~~'

export const removeCommas = (value: string) => value.replace(/,/g, MAGIC_STRING)
export const replaceCommas = (value: string) => value.replace(new RegExp(MAGIC_STRING, 'g'), ',')

export const removeCommasArray = (values: string[]) => values.map((value) => removeCommas(value))
export const replaceCommasArray = (values: string[]) => values.map((value) => replaceCommas(value))

// If input value is longer than maxLength, returns truncated string with "..."
export const truncateString = (string: string, length: number = 30) =>
  string.length < length ? string : `${string.slice(0, length - 2).trim()}...`

// Constructs OR filter for an objects-array i.e. [ {fieldName1: value1}, {fieldName1: value2} ]
// Returns the GraphQL filter i.e: { or: {fieldName1: { equalsTo: value1 }}, {fieldName1: { equalsTo: value2} }}}
// This is useful to filter same key with many values using OR statement
export const constructOrObjectFilters = (filters: { [key: string]: string }[]) => ({
  or: Object.values(filters).map((filter) => {
    // Each filter is currently limited to a single check!
    const filterKey = Object.keys(filter)[0]
    const filterValue = Object.values(filter)[0]
    return { [filterKey]: { equalTo: filterValue } }
  }),
})

// Nicely formatted file sizes, e.g. 1000000 => "1MB"
export const fileSizeWithUnits = (size: number): string => {
  const sizeInKb = size / 1000
  if (sizeInKb < 1000) return `${sizeInKb} kB`
  const sizeInMB = size / 1_000_000
  if (sizeInKb < 1_000_000) return `${parseInt(String(sizeInMB * 10)) / 10} MB`
  const sizeInGB = size / 1_000_000_000
  return `${parseInt(String(sizeInGB * 100)) / 100} GB`
}

// Force a file download
export const downloadFile = async (url: string, filename: string, fetchOptions: object = {}) => {
  const res = await fetch(url, fetchOptions)
  const data = await res.blob()
  const a = document.createElement('a')
  a.href = window.URL.createObjectURL(data)
  a.download = filename
  a.click()
}

// LOCAL STORAGE

// Clear all local storage *except* those keys specified in the input array
export const clearLocalStorageExcept = (input: string | string[]) => {
  const keys = typeof input === 'string' ? [input] : input
  const currentLocalStorageKeys = Object.keys(localStorage)
  currentLocalStorageKeys.forEach((key) => {
    if (!keys.includes(key)) localStorage.removeItem(key)
  })
}
