import React, { useState, useEffect } from 'react'
import useImmune from '../hooks/useImmune'
import Http from '../utils/Http'

export const Status = Union({
  Idle: [],
  Loading: [],
  Done: [[{ tag: String, count: Number, popularity: Number }]],
  Error: [Any],
})

export const Msg = Union({
  RequestTags: [String],
  ReceivedTags: [Result],
})

export const init = () => [Status.Idle()]

export const update = (state, msg) =>
  msg::caseOf({
    RequestTags: source => [
      Status.Loading(),
      Http.send(fetchTags(source), Msg.ReceivedTags),
    ],
    ReceivedTags: result => [
      result::caseOf({
        Ok: ({ body: { tags } }) => Status.Done(tags),
        Err: err => Status.Error(err),
      }),
    ],
  })

export default ({ source }) => {
  const [state, dispatch] = useImmune({ init, update })

  useEffect(() => {
    if (source) dispatch(Msg.RequestTags(source))
  }, [source])

  return (
    <div aria-live="polite">
      {state::caseOf({
        Idle: () => null,
        Loading: () => <p>Fetching tags...</p>,
        Done: tags =>
          tags::count() ? (
            <ol
              aria-label={`list of ${tags::count()} tags related to your query`}
              className="unstyled"
            >
              {tags::map(tagView)}
            </ol>
          ) : (
            <p>Couldn't find any results, try searching for something else.</p>
          ),
        Error: err => <p>Something went wrong, please try again.</p>,
      })}
    </div>
  )
}

const tagView = ({ tag, count, popularity }) => (
  <li key={`${tag}-${count}`} className={`popularity-${popularity}`}>
    <span className="vh">Tag:</span>
    {tag}
    <span className="vh">
      with {count} {count === 1 ? 'mention.' : 'mentions.'}
    </span>
  </li>
)

/* fetchTags :: string -> Task(HTTPError, { tags: [{ tag: string, count: number, popularity: number }] })
 * Returns an asynchronous Task that when executed will deliver the result
 * of asking the tags api for words related to the hashtag or an HTTPError
 */
export const fetchTags = hashtag =>
  Http.get('/api/tags', { params: { q: hashtag } })
