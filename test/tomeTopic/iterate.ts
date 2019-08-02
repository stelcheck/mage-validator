import * as mage from 'mage'
import * as assert from 'assert'

import { ValidatedTomeTopic } from '../../src'

const { ObjectTome, StringTome } = mage.require('tomes')

/**
 * Nested type
 */
class TestTome {
  public childId: string

  public list?: string[]
}

/**
 * Topic index
 */
class Index {
  public id: string
}

/**
 * Tome topic
 */
class TestTomeTopic extends ValidatedTomeTopic {
  public static readonly index = ['id']
  public static readonly indexType = Index

  public name: string
  public children: TestTome[]

  public list: string[]

  public child: TestTome
}

describe('iterate', function () {
  const state = new mage.core.State()

  describe('Object.values', function () {
    it('lists top-level object values', async () => {
      const tTest = await TestTomeTopic.create(state, { id: 'hello' })
      tTest.name = 'hello'
      tTest.list = ['1']

      const vals = Object.values(tTest)

      assert.strictEqual(vals[1], 'hello')
      assert.strictEqual(vals[2][0], '1')
      // assert.deepStrictEqual(vals, ['hello', ['1']])
    })

    it('lists nested object values', async () => {
      const tTest = await TestTomeTopic.create(state, { id: 'hello' })
      tTest.child = new TestTome()
      tTest.child.childId = '2'
      tTest.child.list = ['1']

      const vals = Object.values(tTest.child)

      assert.strictEqual(vals[0], '2')
      assert.strictEqual(vals[1][0], '1')
      // assert.deepStrictEqual(, ['1', ['1']])
    })
  })

  describe('Object.keys', function () {
    it('lists top-level keys', async () => {
      const tTest = await TestTomeTopic.create(state, { id: 'hello' })
      tTest.list = []
      tTest.children = []

      assert.deepStrictEqual(Object.keys(tTest), ['_version', 'list', 'children'])
    })

    it('lists nested tome keys', async () => {
      const tTest = await TestTomeTopic.create(state, { id: 'hello' })
      tTest.child = new TestTome()
      tTest.child.childId = '1'

      assert.deepStrictEqual(Object.keys(tTest.child), ['childId'])
    })

    it('lists nested array keys', async () => {
      const tTest = await TestTomeTopic.create(state, { id: 'hello' })
      tTest.child = new TestTome()
      tTest.list = ['1']

      assert.deepStrictEqual(Object.keys(tTest.list), ['0'])
    })
  })

  describe('for-of (array iterator)', function () {
    it('iteration works with literals', async () => {
      const tTest = await TestTomeTopic.create(state, { id: 'hello' })
      const list = [
        'a',
        'list',
        'of',
        'words'
      ]

      tTest.list = list

      for (const entry of tTest.list) {
        assert.strictEqual(entry, list.shift())
      }
    })

    it('iteration works with objects', async () => {
      const tTest = await TestTomeTopic.create(state, { id: 'hello' })
      const children = [{
        childId: '1'
      }, {
        childId: '3'
      }]

      tTest.children = children

      for (const entry of tTest.children) {
        const child = <TestTome> children.shift()
        assert.strictEqual(entry.childId, child.childId)
      }
    })

    it('iterating over an array of object and mutating the objects works', async () => {
      const tTest = await TestTomeTopic.create(state, { id: 'hello' })
      const children = [{
        childId: '1'
      }, {
        childId: '3'
      }]

      tTest.children = children

      for (const entry of tTest.children) {
        entry.childId += '0'
      }

      assert.strictEqual(tTest.children[0].childId, '10')
      assert.strictEqual(tTest.children[1].childId, '30')
    })
  })

  describe('array.entries', function () {
    it('iteration works with literals', async () => {
      const tTest = await TestTomeTopic.create(state, { id: 'hello' })
      const list = [
        'a',
        'list',
        'of',
        'words'
      ]

      tTest.list = list

      for (const entry of tTest.list.entries()) {
        assert.strictEqual(entry[1], list.shift())
      }
    })

    it('iteration works with objects', async () => {
      const tTest = await TestTomeTopic.create(state, { id: 'hello' })
      const children = [{
        childId: '1'
      }, {
        childId: '3'
      }]

      tTest.children = children

      for (const entry of tTest.children.entries()) {
        const child = <TestTome> children.shift()
        assert.strictEqual(entry[1].childId, child.childId)
      }
    })

    it('iterating over an array of object and mutating the objects works', async () => {
      const tTest = await TestTomeTopic.create(state, { id: 'hello' })
      const children = [{
        childId: '1'
      }, {
        childId: '3'
      }]

      tTest.children = children

      for (const entry of tTest.children.entries()) {
        entry[1].childId += '0'
      }

      assert.strictEqual(tTest.children[0].childId, '10')
      assert.strictEqual(tTest.children[1].childId, '30')
    })
  })

  describe('map, forEach, etc', function () {
    it('return values are accurate', async () => {
      const tTest = await TestTomeTopic.create(state, { id: 'hello' })
      const list = [
        'a',
        'list',
        'of',
        'words'
      ]

      tTest.list = list
      const res = tTest.list.map((entry) => entry += ' good')

      assert.deepStrictEqual(res, [
        'a good',
        'list good',
        'of good',
        'words good'
      ])
    })

    it('iteration works with literals', async () => {
      const tTest = await TestTomeTopic.create(state, { id: 'hello' })
      const list = [
        'a',
        'list',
        'of',
        'words'
      ]

      tTest.list = list
      tTest.list.forEach((entry) => assert.strictEqual(entry, list.shift()))
    })

    it('iteration works with objects', async () => {
      const tTest = await TestTomeTopic.create(state, { id: 'hello' })
      const children = [{
        childId: '1'
      }, {
        childId: '3'
      }]

      tTest.children = children
      tTest.children.forEach((entry) => assert.strictEqual(entry.childId, children.shift()!.childId))
    })

    it('iterating over an array of object and mutating the objects works', async () => {
      const tTest = await TestTomeTopic.create(state, { id: 'hello' })
      const children = [{
        childId: '1'
      }, {
        childId: '3'
      }]

      tTest.children = children
      tTest.children.forEach((entry) => entry.childId += '0')

      assert.strictEqual(tTest.children[0].childId, '10')
      assert.strictEqual(tTest.children[1].childId, '30')
    })

    it('pop/shift returns a proxied tome', async () => {
      const tTest = await TestTomeTopic.create(state, { id: 'hello' })
      tTest.children = [{
        childId: '1'
      }]
      tTest.list = [
        '1'
      ]

      const child = tTest.children.pop()
      const entry = tTest.list.pop()

      assert.strictEqual(child instanceof ObjectTome, false)
      assert.strictEqual(child instanceof Object, true)
      assert.strictEqual(<any> entry instanceof StringTome, false)
      assert.strictEqual(entry, '1')
    })

    it('slice/splice returns an array of proxied tomes', async () => {
      const tTest = await TestTomeTopic.create(state, { id: 'hello' })
      tTest.children = [{
        childId: '1'
      }]
      tTest.list = [
        '1'
      ]

      const child = tTest.children.slice(0, 1)
      const entry = tTest.list.splice(0, 1, '2')

      assert.strictEqual(child instanceof ObjectTome, false)
      assert.strictEqual(child instanceof Object, true)
      assert.strictEqual(child[0].childId, '1')
      assert.strictEqual(<any> entry instanceof StringTome, false)
      assert.deepStrictEqual(entry, ['1'])
      assert.strictEqual(tTest.list[0], '2')
    })

    it('includes returns true if value is found', async () => {
      const tTest = await TestTomeTopic.create(state, { id: 'hello' })
      tTest.children = [{
        childId: '1'
      }]
      tTest.list = [
        '1'
      ]

      const found = tTest.list.includes('1')
      assert.strictEqual(found, true)
    })

    it('find returns a proxied tomes', async () => {
      const tTest = await TestTomeTopic.create(state, { id: 'hello' })
      tTest.children = [{
        childId: '1'
      }]

      const child = tTest.children.find((child) => child.childId === '1')

      assert.strictEqual(child instanceof ObjectTome, false)
      assert.strictEqual(child instanceof Object, true)
      assert.strictEqual(child!.childId, '1')
    })

    it('find returns undefined if nothing is found', async () => {
      const tTest = await TestTomeTopic.create(state, { id: 'hello' })
      tTest.children = [{
        childId: '1'
      }]

      const child = tTest.children.find((child) => child.childId === '2')

      assert.strictEqual(child instanceof ObjectTome, false)
      assert.strictEqual(child instanceof Object, false)
      assert.strictEqual(child, undefined)
    })

    it('filter returns a proxied tomes', async () => {
      const tTest = await TestTomeTopic.create(state, { id: 'hello' })
      tTest.children = [{
        childId: '1'
      }]

      const children = tTest.children.filter((child) => child.childId === '1')

      assert.strictEqual(children[0] instanceof ObjectTome, false)
      assert.strictEqual(children[0] instanceof Object, true)
      assert.strictEqual(children[0]!.childId, '1')
    })
  })
})
