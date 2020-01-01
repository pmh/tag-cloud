import React, { useState } from 'react'

export default ({ submit }) => {
  const [input, setInput] = useState('#')

  return (
    <form onSubmit={e => (e.preventDefault(), setInput('#'), submit(input))}>
      <label htmlFor="tag-input" className="vh">
        Tag input
      </label>
      <input
        id="tag-input"
        autoFocus={true}
        type="search"
        className="large"
        value={input}
        onChange={e => setInput(e.target.value)}
      />
      <input type="submit" value="Go" className="vh" />
    </form>
  )
}
