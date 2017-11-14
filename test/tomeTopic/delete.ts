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

describe('delete', function () {
  const state = new mage.core.State()

  it('the delete keyword works on mutated objects', async () => {
    const tTest = await TestTomeTopic.create(state, { id: '1' })
    tTest.name = 'hi'
    assert.strictEqual(tTest.name, 'hi')
    delete tTest.name
    assert.strictEqual(tTest.name, undefined)
  })

  it('the delete keyword works on objects created with normal data', async () => {
    const tTest = await TestTomeTopic.create(state, { id: '1' }, { name: 'ohai' })
    assert.strictEqual(tTest.name, 'ohai')
    delete tTest.name
    assert.strictEqual(tTest.name, undefined)
  })

  it('the delete keyword works on objects created with tomes', async () => {
    const tTest = await TestTomeTopic.create(state, { id: '1' }, Tome.conjure({ name: 'ohai' }))
    assert.strictEqual(tTest.name, 'ohai')
    delete tTest.name
    assert.strictEqual(tTest.name, undefined)
  })

  it('the delete keyword is ignored if the property is not set on the tome', async () => {
    const tTest = await TestTomeTopic.create(state, { id: '1' })
    delete tTest.name
  })

  it('nested data - values are deletable', async () => {
    const tTest = await TestTomeTopic.create(state, {
      id: '1'
    }, Tome.conjure({
      name: 'ohai',
      url: 'http://google.com',
      child: {
        childId: '2',
        children: [{
          childId: '3',
          children: [{
            childId: '4'
          }]
        }]
      }
    }))

    delete tTest.name
    delete tTest.child.childId
    delete tTest.child.children[0].childId
    tTest.child.children[0].children.pop()

    assert.strictEqual(tTest.name, undefined)
    assert.strictEqual(tTest.child.childId, undefined)
    assert.strictEqual(tTest.child.children[0].childId, undefined)
    assert.strictEqual(tTest.child.children[0].children.length, 0)
  })
})
