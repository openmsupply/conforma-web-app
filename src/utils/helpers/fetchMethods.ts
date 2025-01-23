// Generic GET/POST methods for re-use throughout app
import config from '../../config'

export async function postRequest({
  jsonBody = {},
  otherBody,
  url,
  headers = {},
  timeout,
}: {
  jsonBody?: object
  otherBody?: any
  url: string
  headers?: object
  timeout?: number // seconds
}) {
  const JWT = localStorage.getItem(config.localStorageJWTKey || '')
  const authHeader = JWT ? { Authorization: 'Bearer ' + JWT } : undefined
  const body = otherBody || JSON.stringify(jsonBody)

  try {
    const response = await fetch(url, {
      method: 'POST',
      cache: 'no-cache',
      headers: {
        // 'Content-Type': 'application/json'
        ...authHeader,
        ...headers,
      },
      body,
      signal: timeout ? AbortSignal.timeout(timeout * 1000) : undefined,
    })
    const responseJSON = await response.json()
    if (response.status !== 200) throw new Error(responseJSON.message)
    return responseJSON
  } catch (err) {
    console.log(err)
    throw err
  }
}

export async function getRequest(endpointUrl: string, headers: object = {}) {
  const JWT = localStorage.getItem(config.localStorageJWTKey || '')
  const authHeader = JWT ? { Authorization: 'Bearer ' + JWT } : undefined

  try {
    const response = await fetch(endpointUrl, {
      method: 'GET',
      // cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
        ...headers,
      },
    })
    const responseJSON = await response.json()
    if (response.status !== 200) throw new Error(responseJSON.message)
    return responseJSON
  } catch (err) {
    console.log(err)
    throw err
  }
}
