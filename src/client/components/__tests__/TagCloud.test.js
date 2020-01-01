import { Task } from '../../../shared/immune'
import { Status, Msg, init, update } from '../TagCloud'

describe('init', () => {
  test('it returns an initial state and no effects', () => {
    expect(init()).toEqual([Status.Idle()])
  })
})

describe('update - Msg.RequestTags', () => {
  test('it transitions to the loading state', () => {
    const [initState] = init()
    const [newState] = update(initState, Msg.RequestTags('foo'))
    expect(newState).toEqual(Status.Loading())
  })

  test('it returns an effect', () => {
    const [initState] = init()
    const [_, effect] = update(initState, Msg.RequestTags('foo'))
    expect(effect::is(Task)).toBe(true)
  })
})

describe('update - Msg.ReceivedTags with Result.Ok', () => {
  test('it transitions to the done state', () => {
    const tags = [
      { tag: 'a', count: 2, popularity: 2 },
      { tag: 'b', count: 1, popularity: 1 },
    ]
    const [initState] = init()
    const [newState] = update(
      initState,
      Msg.ReceivedTags(Result.Ok({ body: { tags } })),
    )
    expect(newState).toEqual(Status.Done(tags))
  })

  test('it does not return an effect', () => {
    const tags = [
      { tag: 'a', count: 2, popularity: 2 },
      { tag: 'b', count: 1, popularity: 1 },
    ]
    const [initState] = init()
    const [_, effect] = update(
      initState,
      Msg.ReceivedTags(Result.Ok({ body: { tags } })),
    )
    expect(effect).toBe(undefined)
  })
})

describe('update - Msg.ReceivedTags with Result.Err', () => {
  test('it transitions to the error state', () => {
    const [initState] = init()
    const [newState] = update(
      initState,
      Msg.ReceivedTags(Result.Err({ msg: 'error!' })),
    )
    expect(newState).toEqual(Status.Error({ msg: 'error!' }))
  })

  test('it does not return an effect', () => {
    const [initState] = init()
    const [_, effect] = update(
      initState,
      Msg.ReceivedTags(Result.Err('error!')),
    )
    expect(effect).toBe(undefined)
  })
})
