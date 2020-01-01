import React, { useState, useEffect } from 'react'

export default ({ init = () => ({}), update }) => {
  const [initState, initEff] = init()
  const [state, setState] = useState(initState)

  const runEffect = eff => {
    if (!eff || typeof eff.fork !== 'function') return

    eff.fork(
      () => {},
      msg => {
        const [nextState, nextEff] = update(state, msg)
        setState(nextState)
        runEffect(nextEff)
      },
    )
  }

  useEffect(() => {
    runEffect(initEff)
  }, [initEff])

  return [
    state,
    msg => {
      const [nextState, nextEff] = update(state, msg)
      setState(nextState)
      runEffect(nextEff)
    },
  ]
}

export const Pure = state => [state, null]
export const Impure = state => [state, null]
