import * as mage from 'mage'
import * as assert from 'assert'

import { ValidatedTomeTopic, ValidatedTopic } from '../../src'
import { IsNumberString, IsUrl, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

const { Tome } = mage.require('tomes')

/**
 * Topic index
 */
class Index {
  @IsNumberString()
  public id: string
}

/**
 * Normal validated topic sharing a member of a type
 * shared with a validated tome topic
 */
class TestTopic extends ValidatedTopic {
  public static readonly index = ['id']
  public static readonly indexType = Index

  public child: TestTome

  public garbage: any
}

/**
 * Nested type
 */
class TestTome {
  public num: number

  @IsNumberString()
  public childId: string

  @Type(() => TestTome)
  @ValidateNested()
  public child: TestTome

  public children: TestTome[]
}

/**
 * Tome topic
 */
class TestTomeTopic extends ValidatedTomeTopic {
  public static readonly index = ['id']
  public static readonly indexType = Index

  public num: number

  public name: string

  @IsUrl()
  public url: string

  @Type(() => TestTome)
  @ValidateNested()
  public child: TestTome

  @Type(() => TestTome)
  @ValidateNested()
  public children: TestTome[]

  public untypedChildren: TestTome[]
}

describe('mutate', function () {
  const state = new mage.core.State()

  it('can be mutated', async () => {
    const tTest = await TestTomeTopic.create(state, { id: '1' })
    tTest.name = 'hi'
    assert.strictEqual(tTest.name, 'hi')
  })

  it('can be mutated when created with normal data', async () => {
    const tTest = await TestTomeTopic.create(state, { id: '1' }, {
      name: 'ho'
    })

    assert.strictEqual(tTest.name, 'ho')
    tTest.name = 'hi'
    assert.strictEqual(tTest.name, 'hi')
  })

  it('can be mutated when created with tomes', async () => {
    const tTest = await TestTomeTopic.create(state, { id: '1' }, Tome.conjure({
      name: 'ho'
    }))

    assert.strictEqual(tTest.name, 'ho')
    tTest.name = 'hi'
    assert.strictEqual(tTest.name, 'hi')
  })

  it('nested data - values are appendable', async () => {
    const tTest = await TestTomeTopic.create(state, {
      id: '1'
    }, Tome.conjure({
      name: 'ohai',
      url: 'http://google.com'
    }))

    tTest.child = new TestTome()
    tTest.child.childId = '2'
    tTest.child.children = []

    const subChild = new TestTome()
    subChild.childId = '3'
    tTest.child.children.push(subChild)

    assert.strictEqual(tTest.child.childId, '2')
    assert.strictEqual(tTest.child.children[0].childId, '3')
  })

  it('nested data - values are mutable', async () => {
    const tTest = await TestTomeTopic.create(state, {
      id: '1'
    }, Tome.conjure({
      name: 'ohai',
      url: 'http://google.com',
      child: {
        childId: '2',
        children: []
      }
    }))

    const name = 'hello darkness my old friend, I\'ve come to you to Tome again'

    tTest.name = name
    tTest.child.childId = '10'

    const child = new TestTome()
    child.childId = '20'
    tTest.child.children.push(child)

    assert.strictEqual(tTest.name, name)
    assert.strictEqual(tTest.child.childId, '10')
    assert.strictEqual(tTest.child.children[0].childId, '20')
  })

  it('increments works at the top level', async () => {
    const tTest = await TestTomeTopic.create(state, { id: '1' })
    tTest.num = 1
    tTest.num += 4
    assert.strictEqual(tTest.num, 5)
  })

  it('increments works on nested attributes', async () => {
    const tTest = await TestTomeTopic.create(state, { id: '1' })
    tTest.child = new TestTome()
    tTest.child.num = 1
    tTest.child.num += 4

    assert.strictEqual(tTest.child.num, 5)
  })

  it('Moving an typed tome attribute from a tome topic to normal topic behaves correctly', async () => {
    const tTest = await TestTomeTopic.create(state, { id: '1' })
    tTest.child = new TestTome()
    tTest.child.childId = '123'

    const test = await TestTopic.create(state, { id: '1' })
    test.child = tTest.child
    await test.set()

    const { loaded } = <any> state.archivist
    state.archivist.get = (...args: any[]) => args.pop()(null, loaded.TestTopicoids1.data)

    const retrievedTest = await TestTopic.get(state, { id: '1' })
    assert.deepEqual(retrievedTest, {
      child: {
        childId: '123'
      }
    })
  })

  it('Moving an untyped nested tome attribute from a tome topic to normal topic behaves correctly', async () => {
    const tTest = await TestTomeTopic.create(state, { id: '1' })
    tTest.child = new TestTome()

    /**
     * Here we do a magic trick: we pass child to garbage (which
     * typecasts the tome child as any), then append to it (while it is
     * still a proxied tome in memory)
     *
     * The goal is to append anonymous data on the tome, set the parent topic,
     * then try to load it from cache; it may fail if the proxy
     * generator in ValidatedTomeTopic does not set a valid constructor
     * for anonymous objects
     */
    const test = await TestTopic.create(state, { id: '1' })
    test.garbage = tTest.child
    test.garbage.kid = {
      a: {
        b: '123'
      }
    }

    await test.set()

    const { loaded } = <any> state.archivist
    state.archivist.get = (...args: any[]) => args.pop()(null, loaded.TestTopicoids1.data)

    const retrievedTest = await TestTopic.get(state, { id: '1' })
    assert.deepEqual(retrievedTest.garbage.kid, {
      a: {
        b: '123'
      }
    })
  })

  it('Slicing from top-level untyped tome attribute and inserting the value into a normal topic behaves correctly', async () => {
    const tTest = await TestTomeTopic.create(state, { id: '1' }, {
      untypedChildren: [{
        childId: '123'
      }]
    })

    const test = await TestTopic.create(state, { id: '1' })
    test.child = tTest.untypedChildren.slice(0, 1)[0]

    await test.set()

    const { loaded } = <any> state.archivist
    state.archivist.get = (...args: any[]) => args.pop()(null, loaded.TestTopicoids1.data)

    const retrievedTest = await TestTopic.get(state, { id: '1' })
    assert.deepEqual(retrievedTest.child, {
      childId: '123'
    })
  })
})
