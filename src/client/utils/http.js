import {
  Type,
  Union,
  Any,
  Task,
  map,
  join,
  kvp,
  dissoc,
  divide,
  cata,
  comp,
  getIn,
} from '../../shared/immune'

import axios from 'axios'

export const Response = Type({
  url: String,
  status: { code: Number, message: String },
  headers: Object,
  body: Any,
})

export const Error = Union({
  NetworkError: [Any],
  BadStatus: [Response],
  BadPayload: [Response],
})

export const Request = Union({
  Inactive: [],
  Pending: [],
  Done: [Any],
  Error: [Error],
})

/* get(url: String, params: Optional(Object)) => Task(Response(Object, Error))
 *
 * Returns a task that will fetch data from a rest endpoint.
 *
 * Example:
 *
 *   Http.get("/foo", { params: { bar: 2 }, [...axios-config] })
 *
 */
export const get = (url, config = {}) =>
  Task((fail, succeed) =>
    axios
      .get(url + stringifyParams(config::getIn(['params'])), {
        ...config,
        onDownloadProgress: progressWrapper(config),
      })
      .then(res => succeed(createResponse(url, res)))
      .catch(err => (console.log('err,', err), fail(Error.NetworkError(err)))),
  )

/* getBlob(url: String, params: Optional(Object)) // => HTTP.Request(String, Error)
 *
 * Fetches a binary resource, like an image, and converts it into an object url
 *
 * Example:
 *
 *   Http.getBlob("/image.png", {}).fork(() => {}, data =>
 *     console.log(data)
 *   ) //=> "blob:/42f652bf-770e-4058-8b4b-c67a2a501c90"
 */
export const getBlob = (url, config = {}) =>
  get(url, { ...config, responseType: 'blob' })::map(blob =>
    URL.createObjectURL(blob.body),
  )

/* post(url: String, params: Optional(Object)) => Task(Response(Object, Error))
 *
 * Posts json to an api endpoint
 *
 * Example:
 *
 *   Http.post("/posts", { body: { title: "My post", body: "This is a good post" }, [...axios-config] })
 *
 */
export const post = (url, params = {}) =>
  Task((fail, succeed) =>
    axios
      .post(url, params.body || {}, {
        ...params::dissoc('body'),
        onUploadProgress: progressWrapper(params),
      })
      .then(res => succeed(createResponse(url, res)))
      .catch(err => fail(Error.NetworkError(err))),
  )

/* put(url: String, params: Optional(Object)) => Task(Response(Object, Error))
 *
 * Puts json to an api endpoint
 *
 * Example:
 *
 *   Http.put("/posts/1", { body: { id: 123, title: "My post", body: "This is a good post" }, [...axios-config] })
 *
 */
export const put = (url, params = {}) =>
  Task((fail, succeed) =>
    axios
      .put(url, params.body || {}, {
        ...params::dissoc('body'),
        onUploadProgress: progressWrapper(params),
      })
      .then(res => succeed(createResponse(url, res)))
      .catch(err => fail(Error.NetworkError(err))),
  )

/* patch(url: String, params: Optional(Object)) => Task(Response(Object, Error))
 *
 * Patches the resource at an api endpoint
 *
 * Example:
 *
 *   Http.patch("/posts/1", { body: { title: "My post" }, [...axios-config] })
 *
 */
export const patch = (url, params = {}) =>
  Task((fail, succeed) =>
    axios
      .patch(url, params.body || {}, {
        ...params::dissoc('body'),
        onUploadProgress: progressWrapper(params),
      })
      .then(res => succeed(createResponse(url, res)))
      .catch(err => fail(Error.NetworkError(err))),
  )

/* destroy(url: String, params: Optional(Object)) => Task(Response(Object, Error))
 *
 * Deletes the resource at an api endpoint
 *
 * Example:
 *
 *   Http.destroy("/posts/1", { [...axios-config] })
 *
 */
export const destroy = (url, params = {}) =>
  Task((fail, succeed) =>
    axios
      .delete(url, { ...params, onUploadProgress: progressWrapper(params) })
      .then(res => succeed(createResponse(url, res)))
      .catch(err => fail(Error.NetworkError(err))),
  )

/*
 * request(config: Object) => Task(Response(Object, Error))
 * Manully create a raw axios request object.
 * Returns a task that will execute the request.
 */

export const request = config =>
  Task((fail, succeed) =>
    axios
      .request(config)
      .then(res => succeed(createResponse(config.url, res)))
      .catch(err => fail(Error.NetworkError(err))),
  )

export const send = (task, msg) =>
  Task.perform(
    task,
    error => msg(Result.Err(error)),
    data => msg(Result.Ok(data)),
  )

export default {
  Response,
  Error,
  Request,
  get,
  getBlob,
  post,
  put,
  patch,
  destroy,
  request,
  send,
}

// -- UTILS

const createResponse = (url, res) =>
  Response(
    url,
    { code: res.status, message: res.statusText },
    res.headers,
    res.data,
  )

const progressWrapper = config =>
  config
    ::getIn(['onProgress'])
    ::cata(
      f => evt => f(evt.total < evt.loaded === 0 ? 1 : evt.loaded / evt.total),
      () => evt => {},
    )

const stringifyParams = params => {
  const query = params
    ::cata(comp(map(([k, v]) => `${k}=${JSON.stringify(v)}`), kvp), () => [])
    ::join('&')

  return query.length === 0 ? '' : `?${query}`
}
