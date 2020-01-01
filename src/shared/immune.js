const ProtocolSym = Symbol('protocol')
const TypeKey = Symbol('____TypeKey')
const TypeKeys = Symbol('____TypeKeys')
const KindKey = Symbol('____KindKey')
const CustomType = Symbol('____CustomType')
const TypeConstructor = Symbol('____TypeConstructor')
const UnionType = Symbol('____UnionType')
const UnionCases = Symbol('____UnionCases')
const UnionCase = Symbol('____UnionCase')
const UnionValues = Symbol('____UnionValues')
const AnyType = Symbol('____AnyType')

export const showType = T => {
  if (T == null) return 'Null'

  if (T === String || typeof T === 'string') return 'String'

  if (T === Number || typeof T === 'number') return 'Number'

  if (T === Boolean) return 'Boolean'

  if (T === RegExp || T instanceof RegExp) return 'RegExp'

  if (T === Array) return `Array`

  if (T[KindKey] === CustomType) return T[TypeKey]

  if (T[KindKey] === UnionType) {
    if (T[UnionCase]) return `${T[TypeKey]}.${T[UnionCase]}`
    else return T[TypeKey]
  }

  if (T === Function || typeof T === 'function') return 'Function'

  if (T.constructor === Object)
    return `{ ${Object.keys(T)
      .map(key => `${key}: ${showType(T[key])}`)
      .join(', ')} }`

  if (typeof T === 'string') return `"${T}"`

  return T.toString()
    .replace(/function\s*/, '')
    .replace(/\(\)/, '')
    .replace(/\{\s\[native code\]\s\}/, '')
    .replace(/\{\}/, '')
    .replace(/\s*/g, '')
}

const getType = implementor => {
  if (implementor == null) return Nil

  if (implementor[TypeConstructor]) {
    return implementor[TypeConstructor]
  }

  return implementor.constructor
}

const groupArgs = args => {
  const keys = args.filter((x, i) => i % 2 === 0)
  const vals = args.filter((x, i) => i % 2 === 1)

  return keys.map((x, i) => [x, vals[i]])
}

export const id = x => x
export const identity = id

// -- Core

export const __ = new (function Placeholder() {})()

export function Any() {}
export function Nil() {}
export function Iterator() {}
export function OneOf(...types) {
  if (!(this instanceof OneOf)) return new OneOf(...types)

  this._types = types
}

export const withMeta = (x, meta) => {
  x.meta = x.meta || {}

  Object.keys(meta).forEach(key => {
    x.meta[key] = meta[key]
  })

  return x
}

/*
 * curry(fn, arity = fn.length)
 *
 * Transforms a function into a function that can be partially applied.
 * Given any fixed arity function it returns a new function that can be partially applied.
 *
 * Example:
 *
 *   const times    = curry((a, b) => a * b);
 *   const timesTwo = times(2);
 *   const mod2     = mod(__, 2); // __ can be used as a placeholder for partial application
 *
 *   times(2, 4) //=> 8
 *   times(2)(4) //=> 8
 *   timesTwo(4) //=> 8
 *
 *   mod2(2)     //=> 0
 *   mod2(3)     //=> 1
 */
export const curry = function(f, n) {
  let arity = n == null ? f.length : n
  let name = f.name

  if (arity < 2) return f

  var curriedFn = function(...args) {
    args = args.slice(0, arity)
    let realArity = args.filter(function(x) {
      return x !== __
    }).length
    let self = this

    if (realArity >= arity) return f.apply(self, args)
    else {
      var g = function(...partialArgs) {
        let newArgs = []

        for (var i = 0; i < args.length; i++)
          newArgs[i] =
            args[i] === __
              ? partialArgs.length === 0
                ? undefined
                : partialArgs.shift()
              : args[i]

        return curriedFn.apply(self, newArgs.concat(partialArgs))
      }

      g.toString = curriedFn.toString.bind(curriedFn)

      return g
    }
  }

  curriedFn.toString = f.toString.bind(f)

  return withMeta(curriedFn, { name: f.name })
}

/*
 * assert(test, msg)
 *
 * Throws a TypeError with the provided message if test evaluates to false
 */
export const assert = curry((test, msg) => {
  if (!test) throw new TypeError(msg)
}, 2)

/*
 * is(type, obj)
 *
 * Returns true if 'obj' is of type 'type', false otherwise.
 *
 * Example:
 *
 *   is(String, 'foo') //=> true
 *   is(String, [1,2]) //=> false
 */
export const is = curry((type, obj) => {
  if (obj == null && type === Nil) return true
  if (obj === null && type === null) return true
  if (obj === undefined && type === undefined) return true
  if (obj == null || type == null) return false
  if (type === Any) return true
  if (type === obj) return true
  if (type === Function && typeof obj === 'function') return true
  if (type instanceof OneOf) {
    return type._types.some(is(__, obj))
  }

  if (
    type[TypeKey] != null &&
    type[TypeKey] === obj[TypeKey] &&
    obj[KindKey] === CustomType
  )
    return true

  if (
    obj[KindKey] === UnionType &&
    (!type[UnionCase] || type[UnionCase] === obj[UnionCase]) &&
    (obj[TypeKey] === type[TypeKey] || type[TypeKey] === undefined)
  )
    if (type._tag === 'TypedUnion') {
      return type._types.every((t, i) => is(t, obj[UnionValues][i]))
    } else {
      return true
    }

  if (Array.isArray(type) && Array.isArray(obj) && type.length === 1) {
    return obj.every(is(type[0], __))
  }

  if (type.constructor === Object && obj.constructor === Object) {
    return Object.keys(type).every(key => is(type[key], obj[key]))
  }

  let constructor = obj.constructor

  return !obj[KindKey] && (constructor && constructor === type)
}, 2)

/*
 * comp(...chain)
 *
 * Function composition. The result of comp(f, g)(x) is the same as f(g(x)).
 *
 * Example:
 *   map(comp(isOdd, inc), [1, 2, 3]) // => [false, true, false]
 */
export const comp = (...chain) => x => foldr((f, acc) => f(acc), x, chain)

// -- Protocol

/*
 * Protocol(name, spec)
 *
 * A protocol is a named set of named methods and their signatures that can be extended to multiple types.
 *
 * Example:
 *
 *   const ILookup = Protocol({
 *     get: ['key', 'coll']
 *   })
 *   const { get } = ILookup
 *
 *   extendProtocol(ILookup,
 *     Array, {
 *       get: (key, coll) => maybe(coll[key])
 *     },
 *
 *     Immutable.List, {
 *       get: (key, coll) => maybe(coll.get(key))
 *     }
 *   )
 *
 *   const l1 = [1,2,3]
 *   const l2 = Immutable.List.of(1,2,3)
 *
 *   get(0, [1,2,3])                  //=> Maybe.Some(1)
 *   get(0, Immutable.List.of(1,2,3)) //=> Maybe.Some(1)
 */
export const Protocol = curry((name, spec) => {
  const dispatch = function(funcName, argList) {
    return curry(function(...args) {
      let self = args[args.length - 1]

      let method = (getType(self)[ProtocolSym] || {})[funcName]

      if (!method && self && typeof self[Symbol.iterator] === 'function') {
        method = (Iterator[ProtocolSym] || {})[funcName]
      }

      assert(
        method,
        `No implementation of required function '${funcName}(${argList.join(
          ', ',
        )})' of protocol '${name}' found for type '${showType(getType(self))}'`,
      )

      return method(...args)
    }, argList.length)
  }

  Object.keys(spec).forEach(key => {
    let args = spec[key]
    spec[key] = withMeta(dispatch(key, args), {
      name: key,
      args,
    })
  })

  return spec
}, 2)

/*
 * extendProtocol(Protocol, ...[type, spec])
 *
 * Extends a protocol to one or more types.
 *
 * Example:
 *
 *   extendProtocol(IMonoid,
 *     String, {
 *       concat : (a, b) => a + b,
 *       empty  : ()     => ''
 *     },
 *     Sum, {
 *       concat : (a, b) => a + b,
 *       empty  : ()     => 0
 *     },
 *     Product, {
 *       concat : (a, b) => a * b,
 *       empty  : ()     => 1
 *     },
 *     Array, {
 *       concat : (a, b) => a.concat(b),
 *       empty  : ()     => []
 *     },
 *   )
 */
export const extendProtocol = (protocol, ...rest) => {
  groupArgs(rest).map(([type, impl]) => {
    type[ProtocolSym] = type[ProtocolSym] || {}
    for (var key in impl)
      if (impl.hasOwnProperty(key)) type[ProtocolSym][key] = impl[key]
  })
}

/*
 * extendType(type, ...[protocol, spec])
 *
 * Extends a type to one or more protocols.
 *
 * Example:
 *
 *   extendType(
 *     Array,
 *
 *     ISeq, {
 *       first: coll => maybe(coll[0]),
 *       rest: coll => coll.slice(1),
 *     },
 *
 *     IReduce, {
 *       foldl: (coll, f, initial) => coll.reduce(f, initial)
 *     }
 *   )
 */
export const extendType = (type, ...extensions) => {
  groupArgs(extensions).map(([protocol, impl]) => {
    type[ProtocolSym] = type[ProtocolSym] || {}
    for (var key in impl)
      if (impl.hasOwnProperty(key))
        type[ProtocolSym][key] = curry(impl[key], impl[key].length)
  })
}

export const implementsProtocol = curry((protocol, obj) => {
  const type = getType(obj)

  if (!type) return false

  const protocols = type[ProtocolSym]

  return Object.keys(protocol).every(key => {
    const fn = protocols[key]
    return fn && typeof fn === 'function'
  })
})

// -- MultiMethod

/*
 * defmulti(dispatch)
 *
 * Creates a that provides runtime polymorphic
 * dispatch to different function based on any argument.
 *
 * Example:
 *
 *   const point = defmulti((x, y) => [x, y])
 *   multi::defmethod([1, 2], (x, y) => 'x: 1, y: 2, z: 3')
 *   multi::defmethod([4, 5], (x, y) => 'x: 4, y: 5, z: 6')
 *
 */
export const defmulti = dispatch => {
  const methods = []

  const multimethod = curry((...args) => {
    const method = multimethod.dispatchFn(...args)
    if (Array.isArray(method)) {
      const [fn, unionVals, union] = method
      return fn(...unionVals)
    } else {
      return method(...args)
    }
  }, dispatch.length)

  multimethod.type = 'MultiMethod'
  multimethod.displayName = '<multimethod>'
  multimethod.dispatchFn = /*memoize*/ function(...args) {
    let match
    let i = 0
    let len = methods.length
    let fallback = null

    for (; i < len; i++) {
      const method = methods[i]
      const matcher = method.matcher

      if (matcher === __) {
        fallback = method
      } else {
        const ret = dispatch(...args)

        if (
          is(Union, ret) &&
          is(ret, matcher) &&
          ret[UnionCase] === matcher[UnionCase]
        ) {
          match = [method, ret[UnionValues]]
        }
        if (!is(Union, ret)) {
          if (ret === matcher || ret::deepEqual(matcher)) {
            match = method
            break
          }
        }
      }
    }

    if (!match) {
      if (fallback) {
        match = fallback
      } else {
        throw new Error(
          `Couldn't find a matching handler for argument(s): ${args::show()}`,
        )
      }
    }
    return match
  }
  multimethod.methods = methods
  multimethod.inspect = () => `<MultiMethod>`
  return multimethod
}

/*
 * defmethod(multimethod, matcher, method)
 *
 * Creates and installs a new method of multimethod associated with dispatch-value.
 *
 */
export const defmethod = curry((matcher, fn, multimethod) => {
  fn.matcher = matcher
  multimethod.methods.push(fn)
  return multimethod
}, 3)

// -- Type

/*
 * Type(name, spec)
 *
 * Type(name : String, spec: Object) => Function
 *
 * Creates custom type constructors.
 *
 * Examples:
 *
 *   const Book = Type({ title: String })
 *   const Philosopher = Type({ name: String, books: [Maybe(Book)] })
 *
 *   const judith = Philosopher("Judith Butler",
 *     [ Book("Bodies That Matter")
 *     , Book("Precarious Life")
 *     ]
 *   ) // =>  { name: "Judith Butler", age: 62, books: [{ title: "Bodies That Matter" }, { title: "Precarious Life" }] }
 *
 *   judith::is(Type) //=> true
 *   judith::is(Philosopher) //=> true
 *   judith::is(Book) //=> false
 *
 *  Philosopher("Michel Foucault", "Discipline and Punish") //=>
 *
 *    TypeError:
 *    Invalid types passed into the Philosopher({ name: String, books: [ Book ] }) constructor:
 *      Field: books - expected value of type [ Book ] but got: "Discipline and Punish"
 */
export const Type = (name, spec) => {
  const specKeys = Object.keys(spec)
  const constructor = curry((...values) => {
    const data = specKeys.reduce(
      (acc, key, i) => ((acc[key] = values[i]), acc),
      {},
    )

    const errors = specKeys.reduce((acc, key, i) => {
      const val = values[i]
      const T = spec[key]

      return is(T, val) ? acc : acc.concat({ key, type: T, val })
    }, [])

    if (errors.length) {
      throw new TypeError(`Invalid types passed into the ${name}(${showType(
        spec,
      )}) constructor:
  ${errors
    .map(
      ({ key, type, val }) =>
        `  * Field: ${key} - expected value of type ${showType(
          type,
        )} but got: ${show(val)}`,
    )
    .join('\n')}
  `)
    }

    const type = {
      [TypeKey]: name,
      [TypeKeys]: specKeys,
      [KindKey]: CustomType,
      [TypeConstructor]: constructor,
      ...data,
    }
    type.toString = function() {
      return `${name}(${specKeys.map(key => type[key]::show()).join(', ')})`
    }
    return type
  }, specKeys.length)

  constructor[KindKey] = CustomType
  constructor[TypeKey] = name

  extendType(
    constructor,

    IShow,
    {
      show: type => type.toString(),
    },

    IClone,
    {
      clone: type => type,
      shallowClone: type => type,
    },

    ICount,
    {
      count: type => type[TypeKeys].length,
    },

    ILookup,
    {
      get: (key, type) => maybe(type[key]),
    },

    ISeq,
    {
      first: type => get(0, type),
      rest: type => rest(type[TypeKeys]),
    },

    IKeyed,
    {
      keys: type => type[TypeKeys],
    },
  )

  return constructor
}

// -- Union

export const Union = (name, spec) => {
  const specKeys = Object.keys(spec)

  function _Union(...types) {
    if (!(this instanceof _Union)) {
      return new _Union(...types)
    }

    this._tag = 'TypedUnion'
    this._types = types
  }

  _Union[TypeKey] = name
  _Union[UnionCases] = specKeys
  _Union[KindKey] = UnionType

  extendType(
    _Union,

    IShow,
    {
      show: self =>
        `${name}.${self[UnionCase]}(${self[UnionValues]::map(show)::join(
          ', ',
        )})`,
    },
  )

  return specKeys.reduce((acc, key, i) => {
    const _case = curry((...vals) => {
      const hasErrors = spec[key].some((type, i) => !is(type, vals[i]))

      if (hasErrors) {
        throw new TypeError(`Type mismatch: Type ${name}.${key}(${spec[key]
          .map(showType)
          .join(
            ', ',
          )}) was invoked with incompatible types: ${name}.${key}(${vals
          .map(show)
          .join(', ')})
  `)
      }

      return {
        [TypeKey]: name,
        [UnionCase]: key,
        [KindKey]: UnionType,
        [UnionCases]: specKeys,
        [UnionValues]: vals,
        [TypeConstructor]: _Union,
      }
    }, spec[key].length)

    _case[TypeKey] = name
    _case[KindKey] = UnionType
    _case[UnionCase] = key

    acc[key] = _case

    return acc
  }, _Union)
}

export const caseOf = curry((spec, type) => {
  if (!type || type[KindKey] !== UnionType) {
    throw new TypeError(
      `'caseOf' expects a union type but was called with ${show(type)}`,
    )
  }

  const wildCard = spec._
  const specKeys = Object.keys(spec)

  if (
    !wildCard &&
    !type[UnionCases].every(key => specKeys.some(_case => key === _case))
  ) {
    throw new TypeError(`Non-exhaustive pattern matching detected, expected: ${show(
      type[UnionCases],
    )} but got: ${show(specKeys)}.
  Please provide all cases or use a wildcard.`)
  }

  const match = spec[type[UnionCase]] || wildCard
  return match(...type[UnionValues])
})

// -- Core Protocols

export const IShow = Protocol({
  show: ['x'],
})

export const { show } = IShow

export const IClone = Protocol({
  clone: ['x'],
  shallowClone: ['x'],
})

export const { clone, shallowClone } = IClone

export const ICount = Protocol({
  count: ['xs'],
})

export const { count } = ICount

export const IHash = Protocol({
  hash: ['x'],
})

export const { hash } = IHash

export const ISeq = Protocol({
  first: ['xs'],
  rest: ['xs'],
})

export const { first, rest } = ISeq

export const ICollection = Protocol({
  conj: ['x', 'xs'],
})

export const { conj } = ICollection

export const IIterator = Protocol({
  iterator: ['x'],
})

export const { iterator } = IIterator

export const IKeyed = Protocol({
  keys: ['xs'],
})

export const { keys } = IKeyed

export const IAssociative = Protocol({
  assoc: ['key', 'val', 'xs'],
  dissoc: ['key', 'xs'],
})

export const { assoc, dissoc } = IAssociative

export const ISet = Protocol({
  disj: ['x', 'xs'],
})

export const { disj } = ISet

export const ILookup = Protocol({
  get: ['key', 'xs'],
})

export const { get } = ILookup

export const IMonoid = Protocol({
  empty: ['xs'],
  append: ['x', 'xs'],
})

export const { empty, append } = IMonoid

export const IFold = Protocol({
  foldl: ['f', 'initial', 'xs'],
  foldr: ['f', 'initial', 'xs'],
})

export const { foldl, foldr } = IFold

export const IFunctor = Protocol({
  map: ['f', 'coll'],
})

export const { map } = IFunctor

export const ICata = Protocol({
  cata: ['f', 'g', 'coll'],
})

export const { cata } = ICata

export const IBifunctor = Protocol({
  bimap: ['f', 'g', 'coll'],
})

export const { bimap } = IBifunctor

export const IApply = Protocol({
  ap: ['ma', 'mb'],
})

export const { ap } = IApply

export const IMonadic = Protocol({
  of: ['x', 'm'],
  flatten: ['m'],
})

export const { of, flatten } = IMonadic

// -- Core Types

export const Sum = Type({ val: Number })

export const Product = Type({ val: Number })

// -- Sum Types

export const Maybe = Union({
  Some: [Any],
  None: [],
})

Maybe.get = curry((fallback, m) => cata(id, () => fallback, m), 2)

export const maybe = x =>
  is(Maybe, x) ? x : x == null ? Maybe.None() : Maybe.Some(x)

export const Result = Union({
  Ok: [Any],
  Err: [Any],
})

export const result = (ok, err) =>
  ok == null ? Result.Err(err) : Result.Ok(ok)

/* Task(fork: Function)
 *
 * Like a promise but pure, meaning it will not execute until fork is called.
 *
 * Example:
 *
 *   // Create the task
 *   const delayedTask = Task((fail, succeed) => setTimeout(succeed("hello!"), 1000))
 *
 *   // Transform the eventual result
 *   const transformedTask = delayedTask
 *     ::map(x => x + "!")
 *     ::andThen(x => Task.of(x + " task!!"))
 *
 *   // Actually execute the task
 *   transformedTask::fork(
 *     err => console.log("err:", err)
 *     val => console.log("val:", val)
 *   ) // => *** waits 1 second ***
 *     // => "hello!! Task!!"
 */
export const Task = Type({ fork: Function })

Task.fail = x => Task((fail, succeed) => fail(x))
Task.succeed = x => Task((fail, succeed) => succeed(x))
Task.of = x => Task((fail, succeed) => succeed(x))

/* Task.none
 *
 * A task that does nothing
 */
Task.none = Task((_f, _s) => {})

/* Task.perform(task: Task, error: Function, success: Function) => Task
 *
 * Transforms a regular task into one that never fails.
 *
 */
Task.perform = curry(
  (task, error, success) =>
    Task((_, succeed) =>
      task.fork(
        err => succeed(err != null ? error(err) : error()),
        val => succeed(val != null ? success(val) : success()),
      ),
    ),
  3,
)

Task.fromPromise = p => Task((fail, succeed) => p.then(succeed).catch(fail))

Task.toPromise = t => new Promise((succeed, fail) => t.fork(fail, succeed))

Task.parallel = tasks =>
  Task((fail, succeed) =>
    Promise.all(IFunctor.map(tasks, Task.toPromise))
      .then(succeed)
      .catch(fail),
  )

// -- Core extenstions

extendType(
  Number,

  IShow,
  {
    show: str => str.toString(),
  },

  IClone,
  {
    clone: id,
    shallowClone: id,
  },
)

extendType(
  Boolean,

  IShow,
  {
    show: bool => bool.toString(),
  },

  IClone,
  {
    clone: id,
    shallowClone: id,
  },
)

extendType(
  RegExp,

  IShow,
  {
    show: regex => regex.toString(),
  },

  IClone,
  {
    clone: regex => {
      return new RegExp(
        regex.source,
        regex.global
          ? 'g'
          : '' + regex.ignoreCase
          ? 'i'
          : '' + regex.multiline
          ? 'm'
          : '',
      )
    },
    shallowClone: clone,
  },

  IMonoid,
  {
    empty: self => new RegExp(),

    append: (r2, r1) =>
      new RegExp(
        r1.source + r2.source,
        '',
        r2.global
          ? 'g'
          : '' + r2.ignoreCase
          ? 'i'
          : '' + r2.multiline
          ? 'm'
          : '',
      ),
  },
)

extendType(
  Date,

  IShow,
  {
    show: date => date.toString(),
  },

  IClone,
  {
    clone: date => new Date(date),
    shallowClone: clone,
  },
)

extendType(
  Nil,

  IShow,
  {
    show: _ => 'Nil',
  },

  IClone,
  {
    clone: id,
    shallowClone: clone,
  },
)

extendType(
  Array,

  IShow,
  {
    show: xs => `[ ${xs::map(show).join(', ')} ]`,
  },

  IClone,
  {
    clone: xs => xs::shallowClone()::map(clone),

    shallowClone: xs => xs.slice(),
  },

  ICount,
  {
    count: xs => xs.length,
  },

  ILookup,
  {
    get: (key, xs) => maybe(xs[key]),
  },

  ISeq,
  {
    first: xs => xs::get(0),
    rest: xs => xs.slice(1),
  },

  ICollection,
  {
    conj: (x, xs) => xs.concat(x),
  },

  IIterator,
  {
    iterator: xs => xs[Symbol.iterator](),
  },

  IFold,
  {
    foldl: (f, initial, xs) => xs.reduce((acc, v) => f(v, acc), initial),

    foldr: (f, initial, xs) => xs.reduceRight((acc, v) => f(v, acc), initial),
  },

  IKeyed,
  {
    keys: xs => xs.map((_, i) => i),
  },

  IAssociative,
  {
    assoc: (key, val, xs) =>
      xs::foldlKV((k, v, acc) => append([key === k ? val : v], acc), []),

    dissoc: (key, xs) => xs::removeKV((k, v) => k === key),
  },

  IMonoid,
  {
    empty: _ => [],
    append: (x, xs) => xs.concat(x),
  },

  IFunctor,
  {
    map: (f, xs) => xs.map(x => f(x)),
  },

  IMonadic,
  {
    of: (x, xs) => [x],
    flatten: xs => xs::foldl(append, empty(xs)),
  },

  IApply,
  {
    ap: (ma, mb) => mb::andThen(f => ma::map(f)),
  },
)

extendType(
  String,

  IShow,
  {
    show: str => `"${str}"`,
  },

  IClone,
  {
    clone: str => str,
    shallowClone: clone,
  },

  ICount,
  {
    count: str => str.length,
  },

  ILookup,
  {
    get: (index, str) => maybe(str[index]),
  },

  ISeq,
  {
    first: str => str::get(0),
    rest: str => str.slice(1),
  },

  ICollection,
  {
    conj: (x, str) => str + x,
  },

  IIterator,
  {
    iterator: str => str[Symbol.iterator](),
  },

  IKeyed,
  {
    keys: str => {
      let i = 0
      let keys = []

      for (const _ of str) {
        keys.push(i++)
      }

      return keys
    },
  },

  IAssociative,
  {
    assoc: (k, v, str) =>
      str
        ::split('')
        ::assoc(k, v)
        ::join(''),

    dissoc: (k, self) =>
      self
        ::split('')
        ::dissoc(k)
        ::join(''),
  },

  IMonoid,
  {
    empty: _ => '',
    append: (x, str) => str + x,
  },

  IFold,
  {
    foldl: (f, initial, str) => str::split('')::foldl(f, initial),
    foldr: (f, initial, str) => str::split('')::foldr(f, initial),
  },

  IFunctor,
  {
    map: (f, str) =>
      str
        ::split('')
        ::map(f)
        ::join(''),
  },

  IMonadic,
  {
    of: (x, str) => `${x}`,
    flatten: str => str,
  },

  IApply,
  {
    ap: (ma, mb) => mb::andThen(f => ma::map(f)),
  },
)

extendType(
  Object,

  IShow,
  {
    show: obj =>
      `{ ${obj
        ::foldlKV((k, v, acc) => conj(`${k}: ${show(v)}`, acc), [])
        ::join(', ')} }`,
  },

  IClone,
  {
    clone: map(clone),
    shallowClone: obj => foldlKV((k, v, obj) => ((obj[k] = v), obj), {}, obj),
  },

  IFold,
  {
    foldl: (f, init, obj) =>
      Object.keys(obj).reduce((acc, key) => f(obj[key], acc), init),

    foldr: (f, init, obj) =>
      Object.keys(obj).reduceRight((acc, key) => f(obj[key], acc), init),
  },

  ICount,
  {
    count: comp(count, Object.keys),
  },

  IKeyed,
  {
    keys: Object.keys,
  },

  IAssociative,
  {
    assoc: (k, v, obj) => {
      const copy = shallowClone(obj)
      copy[k] = v
      return copy
    },

    dissoc: (k, obj) => {
      const copy = shallowClone(obj)
      delete copy[k]
      return copy
    },
  },

  ISeq,
  {
    first: obj =>
      Object.keys(obj)
        ::get(0)
        ::map(k => obj[k]),

    rest: obj => {
      const key = Object.keys(obj)::get(0)
      return key::caseOf({ Some: dissoc(__, obj), None: () => ({}) })
    },
  },

  ICollection,
  {
    conj: (x, obj) =>
      Array.isArray(x) ? assoc(x[0], x[1], obj) : foldlKV(assoc, obj, x),
  },

  ILookup,
  {
    get: (key, obj) => maybe(obj[key]),
  },

  IMonoid,
  {
    empty: _ => ({}),
    append: conj,
  },

  IFunctor,
  {
    map: (f, obj) => foldlKV((k, v, acc) => assoc(k, f(v), acc), {}, obj),
  },
)

extendType(
  Maybe,

  IClone,
  {
    clone: map(clone),
    shallowClone: map(shallowClone),
  },

  IMonoid,
  {
    empty: _ => Maybe.None(),
    append: (ma, mb) =>
      mb::caseOf({
        Some: x1 =>
          ma::caseOf({
            Some: x2 => Maybe.Some(append(x2, x1)),
            None: () => mb,
          }),
        None: () => ma,
      }),
  },

  IFold,
  {
    foldl: (f, initial, m) =>
      m::caseOf({
        Some: x => f(initial, x),
        None: () => initial,
      }),

    foldr: (f, initial, m) =>
      m::caseOf({
        Some: x => f(x, initial),
        None: () => initial,
      }),
  },

  IFunctor,
  {
    map: (f, m) => m::caseOf({ Some: comp(maybe, f), None: () => m }),
  },

  ICata,
  {
    cata: (f, g, m) => m::caseOf({ Some: f, None: g }),
  },

  IBifunctor,
  {
    bimap: (f, g, m) =>
      m::caseOf({ Some: x => Maybe.Some(f(x)), None: () => Maybe.None(g()) }),
  },

  IMonadic,
  {
    of: (x, xs) => Maybe.Some(x),
    flatten: ma =>
      ma::caseOf({
        Some: x => (is(Maybe, x) ? x : maybe(x)),
        None: Maybe.None,
      }),
  },

  IApply,
  {
    ap: (mb, ma) =>
      ma::caseOf({
        Some: map(__, mb),
        None: Maybe.None,
      }),
  },
)

extendType(
  Result,

  IClone,
  {
    clone: map(clone),
    shallowClone: map(shallowClone),
  },

  IMonoid,
  {
    empty: x =>
      x::caseOf({ Ok: comp(Result.Ok, empty), Err: comp(Result.Err, empty) }),

    append: (ma, mb) =>
      mb::caseOf({
        Ok: x1 =>
          ma::caseOf({
            Ok: x2 => Result.Ok(append(x2, x1)),
            Err: Result.Err,
          }),
        Err: x1 =>
          ma::caseOf({
            Ok: () => mb,
            Err: x2 => Result.Err(append(x2, x1)),
          }),
      }),
  },

  IFold,
  {
    foldl: (f, initial, m) =>
      m::caseOf({
        Ok: x => f(initial, x),
        Err: () => initial,
      }),

    foldr: (f, initial, m) =>
      m::caseOf({
        Ok: x => f(x, initial),
        Err: () => initial,
      }),
  },

  IFunctor,
  {
    map: (f, fa) => fa::caseOf({ Ok: comp(Result.Ok, f), Err: () => fa }),
  },

  ICata,
  {
    cata: (f, g, fa) => fa::caseOf({ Ok: f, Err: g }),
  },

  IBifunctor,
  {
    bimap: (f, g, fa) =>
      fa::caseOf({ Ok: x => Result.Ok(f(x)), Err: err => Result.Err(g(err)) }),
  },

  IMonadic,
  {
    of: (x, m) => Result.Ok(x),
    flatten: ma =>
      ma::caseOf({
        Ok: x => (is(Result, x) ? x : Result.Ok(x)),
        Err: Result.Err,
      }),
  },

  IApply,
  {
    ap: (mb, ma) =>
      ma::caseOf({
        Ok: map(__, mb),
        Err: Result.Err,
      }),
  },
)

extendType(
  Task,

  IShow,
  {
    show: t => 'Task {}',
  },

  IClone,
  {
    clone: map(clone),
    shallowClone: map(shallowClone),
  },

  IFold,
  {
    foldl: (f, initial, t) =>
      Task((fail, succeed) => {
        t.fork(_ => succeed(initial), x => succeed(f(initial, x)))
      }),

    foldr: (f, initial, t) =>
      Task((fail, succeed) => {
        t.fork(_ => succeed(initial), x => succeed(f(x, initial)))
      }),
  },

  IFunctor,
  {
    map: (f, t) =>
      Task((fail, succeed) => t.fork(fail, val => succeed(f(val)))),
  },

  IBifunctor,
  {
    bimap: (f, g, m) =>
      Task((fail, succeed) => {
        m.fork(err => fail(f(g)), val => succeed(f(val)))
      }),
  },

  IMonadic,
  {
    of: (x, t) => Task.of(x),
    flatten: t =>
      Task((fail, succeed) => {
        fail, succeed
      }),
  },

  IApply,
  {
    ap: (tb, ta) => ta::andThen(map(__, tb)),
  },
)

// -- Function Utils

/*
 * memoize(fn)
 *
 * Returns a memoized version of a referentially transparent function.
 * The memoized version of the function keeps a cache of the mapping from
 * arguments to results and, when calls with the same arguments are repeated
 * often, has higher performance at the expense of higher memory use.
 *
 * created by @philogb and @addyosmani
 * further optimizations by @mathias, @DmitryBaranovsk & @GotNoSugarBaby
 * fixes by @AutoSponge
 * modified by @_pmh_
 * released under an MIT license
 * original implementation: https://github.com/addyosmani/memoize.js
 *
 * Example:
 *
 *   let square = memoize(x => {
 *     console.log('squaring:', x)
 *     return x * 2
 *   })
 *
 *   square(2) // logs 'squaring 2' and returns 4
 *   square(2) // returns 4 without logging
 */
export const memoize = fn => {
  let stringify = JSON.stringify,
    cache = {},
    source = fn.toString()

  let cachedfun = function(...args) {
    let hash = stringify(
      args.map(arg =>
        arg[KindKey] === UnionType ? stringify(arg[UnionValues]) : arg,
      ),
    )
    return hash in cache
      ? cache[hash]
      : (cache[hash] = fn.apply(null, arguments))
  }

  cachedfun.__cache = function() {
    cache.remove ||
      (cache.remove = function() {
        var hash = stringifyJson(arguments)
        return delete cache[hash]
      })
    return cache
  }.call(this)

  cachedfun.toString = function() {
    return source
  }

  return cachedfun
}

/*
 * pipe(x, ...chain)
 *
 * Allows threading a value through a series of functions.
 *
 * Example:
 *
 *   pipe(list(1,2,3), conj(4), map(square), filter(even)) //=> Seq [ 4, 16 ]
 */
export const pipe = (x, ...chain) => foldl((f, v) => f(v), x, chain)

/*
 * liftA2(fn, ap1, ap2)
 *
 * Lifts a regular function of two arguments into a function that can operate on the values of two applicatives.
 *
 * Example:
 *   lift(add, [2, 3], [3, 3])
 *     //=> [5, 5, 6, 6]
 *
 *   lift(conj, Maybe.Some(3), Maybe.Some([1, 2]))
 *     // => Maybe.Some([1, 2, 3])
 */
export const liftA2 = curry((fn, ap1, ap2) => ap1::map(fn)::ap(ap2), 3)

/*
 * liftA3(fn, ap1, ap2, ap3)
 *
 * Like liftA2 but works with functions of three arguments
 */
export const liftA3 = curry(
  (fn, ap1, ap2, ap3) =>
    ap1
      ::map(fn)
      ::ap(ap2)
      ::ap(ap3),
  4,
)

/*
 * liftA4(fn, ap1, ap2, ap3, ap4)
 *
 * Like liftA2 but works with functions of four arguments
 */
export const liftA4 = curry(
  (fn, ap1, ap2, ap3, ap4) =>
    ap1
      ::map(fn)
      ::ap(ap2)
      ::ap(ap3)
      ::ap(ap4),
  5,
)

/*
 * liftA5(fn, ap1, ap2, ap3, ap4, ap5)
 *
 * Like liftA2 but works with functions of five arguments
 */
export const liftA5 = curry(
  (fn, ap1, ap2, ap3, ap4, ap5) =>
    ap1
      ::map(fn)
      ::ap(ap2)
      ::ap(ap3)
      ::ap(ap4)
      ::ap(ap5),
  6,
)

/*
 * liftA6(fn, ap1, ap2, ap3, ap4, ap5, ap6)
 *
 * Like liftA2 but works with functions of six arguments
 */
export const liftA6 = curry(
  (fn, ap1, ap2, ap3, ap4, ap5, ap6) =>
    ap1
      ::map(fn)
      ::ap(ap2)
      ::ap(ap3)
      ::ap(ap4)
      ::ap(ap5)
      ::ap(ap6),
  7,
)

// -- Generic utils

export const getOrElse = curry((key, fallback, xs) =>
  xs::get(key)::caseOf({ Some: id, None: () => fallback }),
)

export const getInOrElse = curry((path, fallback, xs) =>
  xs::getIn(path)::caseOf({ Some: id, None: () => fallback }),
)

export const foldlKV = curry((f, initial, xs) =>
  xs::keys()::foldl((k, acc) => f(k, xs::getOrElse(k, void 0), acc), initial),
)

export const foldrKV = curry((f, initial, x) =>
  xs::keys()::foldr((k, acc) => f(k, xs::getOrElse(k, void 0), acc), initial),
)

export const andThen = curry((fn, m) => m::map(fn)::flatten(), 2)

// -- List utils

export const join = curry((sep, xs) => xs.join(sep), 2)

export const slice = curry((start, end, coll) => coll.slice(start, end), 3)

export const sliceFrom = curry((start, coll) => coll.slice(start), 2)

export const any = curry(
  (f, xs) => xs::foldl((x, acc) => (acc ? acc : !!f(x)), false),
  2,
)

export const every = curry(
  (f, xs) => xs::foldl((x, acc) => (!acc ? acc : !!f(x)), true),
  2,
)

// -- Collection Utils

/*
 * join(sep, str)
 *
 * Joins a list of strings into a single string separated by a character
 */
export const filterKV = curry(
  (f, xs) =>
    xs::foldlKV((k, v, acc) => (f(k, v) ? acc::conj(v) : acc), empty(xs)),
  2,
)

export const filter = curry((f, xs) => xs::filterKV((k, v) => f(v)), 2)

export const removeKV = curry((f, coll) => coll::filterKV(f), 2)

export const remove = curry((f, coll) => coll::removeKV((k, v) => f(v)), 2)

export const take = curry((n, xs) => {
  let vals = []

  if (n === 0) return vals

  for (const val of xs::iterator()) {
    vals = vals::conj(val)
    if (vals::count() === n) break
  }
  return vals
}, 2)

export const into = curry((to, from) => from::foldl(conj, to), 2)

/* getIn(key: [Number | String] | String, obj: Any) => Maybe
 *
 * If key is found in obj it returns the key wrapped in a Some,
 * otherwise a None is returned
 *
 *   Examples:
 *
 *     { x: { y: 'z' } }::getIn(['x', 'y']) //=> Maybe.Some('z')
 *     { x: {} }::getIn(['x', 'y'])         //=> Maybe.None( )
 *
 *     [ [ ['a', 'b'], ['c', 'd'] ] ]::getIn([0, 1, 0]) //=> Maybe.Some('c')
 *     []::getIn([0, 1, 0])                             //=> Maybe.None( )
 *
 */
export const getIn = curry(
  ([key, ...rest], obj) =>
    rest::count() === 0
      ? obj::get(key)
      : obj
          ::get(key)
          ::caseOf({ Some: x => x::getIn(rest), None: () => obj::get(key) }),
  2,
)

/* assocIn(path: [Number | String], value: Any, obj: Any) => Any
 *
 * Like assoc but accepts a path instead of a single key
 *
 */
export const assocIn = curry(
  ([key, ...rest], val, obj) =>
    rest::count() === 0
      ? obj::assoc(key, val)
      : obj::get(key)::caseOf({
          Some: x => obj::assoc(key, x::assocIn(rest, val)),
          None: () => obj::assoc(key, obj::empty()::assocIn(rest, val)),
        }),
  3,
)

/* dissocIn(key: [Number | String], obj: Any) => Any
 *
 * Like dissoc but accepts a path instead of a single key
 *
 */
export const dissocIn = curry(
  ([key, ...rest], obj) =>
    rest::count() === 0
      ? obj::dissoc(key)
      : obj::get(key)::caseOf({
          Some: x => obj::assoc(key, x::dissocIn(rest)),
          None: () => obj::assoc(key, obj::empty()::dissocIn(rest)),
        }),
  2,
)

/* evolve(transformations: Object, coll: Object) => Object
 *
 * Given an object and a "receipt" of changes it returns a
 * new copy of the original collection with the changes applied.
 * Throws an error if a key in the "receipt" doesn't exist in th collection
 *
 * Example:
 *
 * const state = { counters: { counterA: 0, counterB: 0, counterC: 0 } }
 *
 * state::evolve({ counters: { counterA: 4, counterB: plus(20) } })
 *   //=> { counters: { counterA: 4, counterB: 20, counterC: 0 } }
 *
 * state::evolve({ counters: { counterA: 4, counterD: plus(20) } })
 *   //=> TypeError: Unable to find path: [ "counters", "counterD" ] in { counters: { counterA: 0, counterB: 0, counterC: 0 } }
 */
export const evolve = curry(
  (transformations, object) =>
    transformations::foldlKV((key, val, acc) => {
      if (val.constructor === Object && !val::is(Union) && !val::is(Type)) {
        return acc::assoc(key, evolve(val, object::getOrElse(key, empty(acc))))
      } else if (typeof val === 'function') {
        return acc::assoc(key, val(acc::getOrElse(key, void 0)))
      } else {
        return acc::assoc(key, val)
      }
    }, object),
  2,
)

export const vals = curry(xs => xs::foldl((val, acc) => acc::append(val), []))

export const kvp = curry(xs =>
  xs::foldlKV((key, val, acc) => acc::conj([[key, val]]), []),
)

/*
 * zip(...xs)
 *
 * Merges together the values of multiple seqables with the values at the corresponding position.
 *
 * Example:
 *
 *   zip(['x', 'y'], [1, 2])  //=> [['x', 1], ['y', 2]]
 *   zip(['x', 'y'], Range()) //=> [['x', 1], ['y', 2]]
 */
export const zip = (...xs) => {
  const shortest = xs::foldl(
    (x, acc) => (x::count() < acc::count() ? x : acc),
    xs::getOrElse(0, []),
  )

  return shortest::foldlKV(
    (k, v, acc) => acc::append([xs::map(getOrElse(k, void 0))]),
    [],
  )
}

/*
 * Value equality check with semantics similar to Object.is,
 * but treats Immutable Iterables as values,
 * equal if the second Iterable includes equivalent values.
 */
export const equal = curry((a, b) => a === b, 2)

export const shallowEqual = curry((a, b) => {
  if (a == null || b == null) return false

  if (implementsProtocol(ILookup, a) && implementsProtocol(IKeyed, b))
    return b::foldlKV(
      (k, v, acc) => (!acc ? acc : a::getOrElse(k, false)::equal(v)),
      true,
    )
  else return a::equal(b)
}, 2)

export const deepEqual = curry((a, b) => {
  if (a == null || b == null) return false

  if (is(String, a) || is(String, b)) return a::equal(b)

  if (implementsProtocol(ILookup, a) && implementsProtocol(IKeyed, b)) {
    return b::foldlKV(
      (k, v, acc) => (!acc ? acc : a::getOrElse(k, false)::deepEqual(v)),
      true,
    )
  } else return a::equal(b)
}, 2)

// -- String Utils

/*
 * split(sep, str)
 *
 * Splits a string into a list of strings
 */
export const split = curry((sep, str) => str.split(sep), 2)

/*
 * replace(pattern, replacement, str)
 *
 * Replaces occurrances of pattern in str with the replacement string.
 */
export const replace = curry(
  (pattern, replacement, str) => str.replace(pattern, replacement),
  3,
)

/*
 * lowercase(str)
 *
 * Returns the source string in all lowercase.
 */
export const lowercase = str => str.toLowerCase()

/*
 * uppercase(str)
 *
 * Returns the source string in all uppercase.
 */
export const uppercase = str => str.toUpperCase()
