import React, { useState } from 'react'
import AppHeader from '../components/AppHeader'
import SearchForm from '../components/SearchForm'
import TagCloud from '../components/TagCloud'
import useImmune from '../hooks/useImmune'

export const Msg = Union({
  UpdateSource: [String],
})

export const init = () => [Maybe.None()]

export const update = (state, msg) =>
  msg::caseOf({
    UpdateSource: source => [maybe(source)],
  })

export default () => {
  const [state, dispatch] = useImmune({ init, update })

  return (
    <div className="page tag-cloud">
      <AppHeader />
      <SearchForm submit={comp(dispatch, Msg.UpdateSource)} />
      {state::cata(
        source => (
          <div key={source} className="card centered-text">
            <TagCloud source={source} />
          </div>
        ),
        () => (
          <p>
            Nothing to see here! Please enter a twitter hashtag in the field
            above to generate a tag cloud of the most commonly used words
            associated with that hashtag.
          </p>
        ),
      )}
    </div>
  )
}
