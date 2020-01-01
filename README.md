# TagCloud

## Introduction

A simple webapp for generating a tag cloud from a user supplied hashtag by using the twitter search api to find tweets using the tag and calculating the frequency of the words that are used in conjunction with it.

## Technologies

React (https://reactjs.org) is used as the view layer on the frontend and the api endpoint is built as a node js lamda function.

For data transformation and statemanagement Immune.js is used which is a library for functional programming that I've been working on for a while. Some of it's features includes:

- **Protocol-based dispatch**
  This is a feature inspired by clojure which essentially makes it possible to write functions that are polymorphic on the last argument. This means that we can define a function like map and have it select a different implementation based on what type we invoke it with, so if it's called with an array it will choose one implementation and if it's called with a maybe it will choose another.

- **Tagged unions** This is a feature inspired by languages like Haskell and ocaml. Tagged unions can be compared to enums in other languages but are more powerful since each case can also hold data.

```js
const Maybe = Union({ Some: [String], None: [] })

const some = Maybe.Some('abc') //=> Maybe.Some("abc")
const none = Maybe.None() //=> Maybe.Nome()

caseOf({ Some: x => x + '!', None: () => 'n/a' }, some) //=> "abc!"
caseOf({ Some: x => x + '!', None: () => 'n/a' }, none) //=> "n/a"
```

- **Currying** All functions in immune are curried and data-last by default meaning they can be partially applied by leaving of arguments at the end. The currying implementation in immune also supports positional application by putting \_\_ as an argument.

```js
const inc = map(x => x + 1)
inc([1, 2, 3]) //=> [2,3,4]

const positional = map(__, [1, 2, 3])
positional(x => x + 1) //=> [2,3,4]
```

- **Babel plugins** Immune also comes with a set of optional babel plugins that eases development in various ways.
  - **auto-import** automatically imports immune functions as they are used unless the name has already been bound to something else.
  - **auto-name** Automativally names tagged unions, protocols and types.
  - **chain** Redefines the :: operator to act as a function pipeline instead of binding 'this'.

## Development

1. Clone the repository
2. Create a .env file inside the app folder with your twitter api keys:

```
CONSUMER_KEY="<CONSUMER_KEY>"
CONSUMER_SECRET="<CONSUMER_SECRET>"
TOKEN="<TOKEN>"
TOKEN_SECRET="<TOKEN_SECRET"
```

3. Run `yarn install`
4. Run `yarn test` to run the test suite
5. Run `yarn start` to start the development server and open up `http://localhost:3000`
