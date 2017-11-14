import * as mage from 'mage'
import * as assert from 'assert'

import { ValidatedTomeTopic } from '../../src'
import { IsNumberString, IsUrl, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

const { Tome } = mage.require('tomes')

/**
 * Nested type
 */
class TestTome {
  @IsNumberString()
  public childId: string

  @Type(() => TestTome)
  @ValidateNested()
  public child: TestTome

  @Type(() => TestTome)
  @ValidateNested()
  public children: TestTome[]
}

/**
 * Topic index
 */
class Index {
  @IsNumberString()
  public id: string
}


/**
 * Tome topic
 */
class TestTomeTopic extends ValidatedTomeTopic {
  public static readonly index = ['id']
  public static readonly indexType = Index

  public name: string

  @IsUrl()
  public url: string

  @Type(() => TestTome)
  @ValidateNested()
  public child: TestTome

  @Type(() => TestTome)
  @ValidateNested()
  public children: TestTome[]
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
})
