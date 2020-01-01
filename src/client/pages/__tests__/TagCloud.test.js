import { Msg, init, update } from '../TagCloud'

describe('init', () => {
  test('it returns an initial state with no effect', () => {
    expect(init()).toEqual([Maybe.None()])
  })
})

describe('update - Msg.UpdateSource', () => {
  test('it transitions from the initial state to a Some holding the provided content', () => {
    const [initState] = init()
    const [nextState] = update(initState, Msg.UpdateSource('foo'))
    expect(nextState).toEqual(Maybe.Some('foo'))
  })

  test('it transitions the state from updated state to a Some holding newprovided content', () => {
    const [initState] = init()
    const [nextState] = update(
      update(initState, Msg.UpdateSource('foo')),
      Msg.UpdateSource('bar'),
    )
    expect(nextState).toEqual(Maybe.Some('bar'))
  })

  test('it does not return an effect', () => {
    const [initState] = init()
    const [_, effect] = update(initState, Msg.UpdateSource('foo'))
    expect(effect).toBe(undefined)
  })
})
