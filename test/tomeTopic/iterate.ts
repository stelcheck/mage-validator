import * as mage from 'mage'
import * as assert from 'assert'

import { ValidatedTomeTopic } from '../../src'

/**
 * Nested type
 */
class TestTome {
  public childId: string
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

  public children: TestTome[]

  public list: string[]

  public child: TestTome
}

describe('iterate', function () {
  const state = new mage.core.State()

  describe('object keys', function () {
    it('lists top-level keys', async () => {
      const tTest = await TestTomeTopic.create(state, { id: 'hello' })
      tTest.list = []
      tTest.children = []

      assert.deepStrictEqual(Object.keys(tTest), ['list', 'children'])
    })

    it('lists tome attributes keys', async () => {
      const tTest = await TestTomeTopic.create(state, { id: 'hello' })
      tTest.child = new TestTome()
      tTest.child.childId = '1'

      assert.deepStrictEqual(Object.keys(tTest.child), ['childId'])
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

      for (const [_, entry] of tTest.list.entries()) {
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

      for (const [_, entry] of tTest.children.entries()) {
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

      for (const [_, entry] of tTest.children.entries()) {
        entry.childId += '0'
      }

      assert.strictEqual(tTest.children[0].childId, '10')
      assert.strictEqual(tTest.children[1].childId, '30')
    })
  })

  describe('map, forEach, etc', function () {
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
  })
})
