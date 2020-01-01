import { Task } from '../shared/immune'
import axios from 'axios'
import request from 'request'
import stopWords from './resources/stop-words.js'

const isBetween = curry((low, high, x) => x >= low && x <= high)

const notPopular = isBetween(0, 1)
const somewhatPopular = isBetween(1, 2)
const popular = isBetween(3, 4)
const veryPopular = isBetween(5, 6)
const extremelyPopular = isBetween(7, Infinity)

export const Popularity = {
  NotPopular: 1,
  SomewhatPopular: 2,
  Popular: 3,
  VeryPopular: 4,
  ExtremelyPopular: 5,
}

export default (req, res) => {
  fetchTweets(req.query.q).fork(
    err => (console.log('error', err), res.json({ tags: [], msg: 'err' })),
    tweets =>
      res.json({
        tags: tweets
          ::extractText()
          ::cleanupText()
          ::wordFrequencies(stopWords)
          ::generateTagMap(),
      }),
  )
}

// -- Utilities --

/* calculatePopularityScore :: Number -> Number
 * Calculates a popularity score based on a count
 */
export const popularity = count => {
  if (notPopular(count)) return Popularity.NotPopular

  if (somewhatPopular(count)) return Popularity.SomewhatPopular

  if (popular(count)) return Popularity.Popular

  if (veryPopular(count)) return Popularity.VeryPopular

  return Popularity.ExtremelyPopular
}

/* limitTagPopularityCount :: Number -> [tag] -> [Tag]
 * Limits the number of tags with the same popularity
 * that we want to keep.
 */
export const limitTagPopularityCount = limit =>
  comp(
    getOrElse('tags', []),
    foldl(
      (tag, { tags, popularityCount }) =>
        popularityCount::get(tag.popularity.toString())::cata(
          count =>
            count < limit
              ? {
                  tags: tags::conj(tag),
                  popularityCount: popularityCount::assoc(
                    tag.popularity,
                    count + 1,
                  ),
                }
              : {
                  tags,
                  popularityCount,
                },
          () => ({
            tags: tags::conj(tag),
            popularityCount: popularityCount::assoc(tag.popularity, 1),
          }),
        ),
      { tags: [], popularityCount: {} },
    ),
  )

/* sortTags :: [Tag]
 * Sorts the list of tags by name
 */
export const sortTags = tags => tags.sort((a, b) => (a.tag > b.tag ? 1 : -1))

/* generateTagMap :: { string: number } -> [{ tag: string, count: number, popularity: number }]
 *
 * A function that given a word frequnecy map returns a list of objects
 * representing each word, it's frequency and it's popularity.
 */
export const generateTagMap = comp(
  sortTags,
  limitTagPopularityCount(5),
  map(([tag, count]) => ({ tag, count, popularity: popularity(count) })),
  kvp,
)

/* wordFrequencies :: string -> [string] -> { string: number }
 *
 * A function that given a stopword map a string of text
 * returns an object mapping each word that is not among the stopwords
 * to a number representing the amount of times it appears in the source text.
 */
export const wordFrequencies = curry((stopWords, source) =>
  source
    ::split(/\s+/)
    ::map(lowercase)
    ::foldl((word, wordMap) => {
      const normalizedWord = word.trim()
      return stopWords[normalizedWord]
        ? wordMap
        : wordMap::assoc(
            normalizedWord,
            wordMap::getOrElse(normalizedWord, 0) + 1,
          )
      return wordMap
    }, {}),
)

const fetchTweets = hashtag =>
  Task((fail, succeed) => {
    request(
      {
        url: `https://api.twitter.com/1.1/search/tweets.json?q=${hashtag::replace(
          '#',
          '%23',
        )}`,
        method: 'GET',
        oauth: {
          consumer_key: process.env.CONSUMER_KEY,
          consumer_secret: process.env.CONSUMER_SECRET,
          token: process.env.TOKEN,
          token_secret: process.env.TOKEN_SECRET,
        },
      },
      (err, resp, body) => {
        if (err) fail(err)

        succeed(JSON.parse(body).statuses)
      },
    )
  })

/* extractText :: [{ text: string, ... }] -> string
 * A function that given a list of tweets (or really any list of objects with a text field)
 * extracts the text contents and returns them as one big string.
 */
export const extractText = comp(join(' '), map(getOrElse('text', '')))

/* cleanupText :: string -> string
 * Removes noise from the source text
 */
export const cleanupText = comp(
  replace(/(\'|\")/g, ''), // remove quotation marks
  replace(/\@[a-zA-Z0-9\_\-]+/g, ''), // remove twitter handles
  replace(/\#/g, ''), // remove hashsigns
  replace(/\RT/g, ''), // remove RT notations
  replace(/[0-9]+/g, ''), // remove digits
  replace(/\,/g, ''), // remove comma signs
  replace(/\./g, ''), // remove dots
  replace(/\:/g, ''), // remove colons
  replace(/\?/g, ''), // remove questionmarks
  replace(/\!/g, ''), // remove exclamations
  replace(/\+/g, ''), // remove plus signs
  replace(/(\(|\))/g, ''), // remove plus signs
  replace(/\…/g, ''), // remove ellipsis
  replace(/https?\:\/\/[a-zA-Z0-9\.\-\_\/]+/g, ''), // remove url's
)
