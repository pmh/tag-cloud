const {
  cleanupText,
  extractText,
  wordFrequencies,
  generateTagMap,
  popularity,
  sortTags,
} = require('../tags')

describe('sort tags', () => {
  test('it sorts a list of tags alphabetically', () => {
    expect(
      sortTags([
        { tag: 'c', count: 1, popularity: 1 },
        { tag: 'b', count: 1, popularity: 1 },
        { tag: 'a', count: 1, popularity: 1 },
      ]),
    ).toEqual([
      { tag: 'a', count: 1, popularity: 1 },
      { tag: 'b', count: 1, popularity: 1 },
      { tag: 'c', count: 1, popularity: 1 },
    ])
  })
})

describe('generateTagMap', () => {
  test('it turns a word frequency map into an alphabetically sorted list of tags with a popularity score', () => {
    expect(generateTagMap({ foo: 3, bar: 2, baz: 1 })).toEqual([
      { tag: 'bar', count: 2, popularity: popularity(2) },
      { tag: 'baz', count: 1, popularity: popularity(1) },
      { tag: 'foo', count: 3, popularity: popularity(3) },
    ])
  })

  test('it limits the number of tags with a given popularity count to 5', () => {
    expect(
      generateTagMap({
        a: 1,
        b: 1,
        c: 1,
        d: 1,
        e: 1,
        f: 1,
        g: 2,
        h: 2,
        i: 2,
        j: 2,
        k: 2,
        l: 2,
        m: 2,
        n: 2,
      }),
    ).toEqual([
      { tag: 'a', count: 1, popularity: popularity(1) },
      { tag: 'b', count: 1, popularity: popularity(1) },
      { tag: 'c', count: 1, popularity: popularity(1) },
      { tag: 'd', count: 1, popularity: popularity(1) },
      { tag: 'e', count: 1, popularity: popularity(1) },
      { tag: 'g', count: 2, popularity: popularity(2) },
      { tag: 'h', count: 2, popularity: popularity(2) },
      { tag: 'i', count: 2, popularity: popularity(2) },
      { tag: 'j', count: 2, popularity: popularity(2) },
      { tag: 'k', count: 2, popularity: popularity(2) },
    ])
  })
})

describe('wordFrequencies', () => {
  test('it returns a map of words to the number of times they appear in a string of text', () => {
    expect(wordFrequencies({}, 'foo bar baz foo foo bar')).toEqual({
      foo: 3,
      bar: 2,
      baz: 1,
    })
  })
  test('it filters out stop words', () => {
    expect(
      wordFrequencies({ foo: true, baz: true }, 'foo bar baz foo foo bar'),
    ).toEqual({
      bar: 2,
    })
  })
})

describe('extractText', () => {
  test('it turns a list of tweets into a string by concatenating their text content', () => {
    expect(
      extractText([{ text: 'foo' }, { text: 'bar' }, { text: 'baz' }]),
    ).toBe('foo bar baz')
  })
})

describe('cleanupText', () => {
  test('it removes single qoutes', () => {
    expect(cleanupText("foo 'bar' baz")).toBe('foo bar baz')
  })

  test('it removes double qoutes', () => {
    expect(cleanupText('foo "bar" baz')).toBe('foo bar baz')
  })

  test('it removes twitter handles', () => {
    expect(cleanupText('foo @bar1_baz-quux abc')).toBe('foo  abc')
  })

  test('it removes twitter handles followed by a colon', () => {
    expect(cleanupText('foo @bar1_baz-quux: abc')).toBe('foo  abc')
  })

  test('it removes hash signs', () => {
    expect(cleanupText('foo #bar baz')).toBe('foo bar baz')
  })

  test('it removes RT notations', () => {
    expect(cleanupText('RT foo bar baz')).toBe(' foo bar baz')
  })

  test('it removes digits', () => {
    expect(cleanupText('foo 123 baz 456')).toBe('foo  baz ')
  })

  test('it removes commas', () => {
    expect(cleanupText('foo, bar, baz')).toBe('foo bar baz')
  })

  test('it removes dots', () => {
    expect(cleanupText('foo. bar. baz.')).toBe('foo bar baz')
  })

  test('it removes colons', () => {
    expect(cleanupText('foo: bar: baz:')).toBe('foo bar baz')
  })

  test('it removes question marks', () => {
    expect(cleanupText('foo? bar? baz?')).toBe('foo bar baz')
  })

  test('it removes exclamations', () => {
    expect(cleanupText('foo! bar! baz!')).toBe('foo bar baz')
  })

  test('it removes plus signs', () => {
    expect(cleanupText('foo+ bar+ baz+')).toBe('foo bar baz')
  })

  test('it removes parens', () => {
    expect(cleanupText('foo() bar) baz(')).toBe('foo bar baz')
  })

  test('it removes ellipsis', () => {
    expect(cleanupText('foo… bar… baz…')).toBe('foo bar baz')
  })

  test('it removes hyperlinks', () => {
    expect(cleanupText('foo https://foo.com bar http://www.bar.com baz')).toBe(
      'foo  bar  baz',
    )
  })
})
