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
 * Test index
 */
class Index {
  @IsNumberString()
  public id: string
}

/**
 * Test tome topic
 */
class TestTomeTopic extends ValidatedTomeTopic {
  public static readonly index = ['id']
  public static readonly indexType = Index

  public defaultValue: number = 1

  public name: string

  @IsUrl()
  public url: string

  @Type(() => TestTome)
  @ValidateNested()
  public child: TestTome

  @Type(() => TestTome)
  @ValidateNested()
  public children: TestTome[] = []
  public whatever: any
}

describe('create', function () {
  const state = new mage.core.State()

  it('can be created without data', async () => {
    const tTest = await TestTomeTopic.create(state, { id: '1' })
    assert.strictEqual(tTest.defaultValue, 1)
    assert.strictEqual(tTest.name, undefined)
  })

  it('can be created with normal data', async () => {
    const tTest = await TestTomeTopic.create(state, { id: '1' }, { name: 'ohai' })
    assert.strictEqual(tTest.name, 'ohai')
  })

  it('default values do not overwrite existing ones', async () => {
    const tTest = await TestTomeTopic.create(state, { id: '1' }, { defaultValue: 3 })
    assert.strictEqual(tTest.defaultValue, 3)
  })

  it('can be created with a tome', async () => {
    const tome = Tome.conjure({ name: 'ohai' })
    const tTest = await TestTomeTopic.create(state, { id: '1' }, tome)
    assert.strictEqual(tTest.name, 'ohai')
  })

  it('tome nested values are properly set and accessible', async () => {
    const test = new TestTome()
    test.childId = '1'

    const tome = Tome.conjure({ name: 'ohai', children: [test] })
    const tTest = await TestTomeTopic.create(state, { id: '1' }, tome)
    assert.strictEqual(tTest.children.length, 1)
    assert.strictEqual(tTest.children[0].childId, '1')
  })

  it('getData returns the tome instance', async () => {
    const tTest = await TestTomeTopic.create(state, { id: '1' })
    const data = tTest.getData()

    // Nothing should be set on the tome instance
    assert(Tome.isTome(data))
  })

  it('nested data - values are accessible', async () => {
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

    assert.strictEqual(tTest.child.childId, '2')
    assert.deepStrictEqual(tTest.child.children.constructor, Array)
    assert.strictEqual(tTest.child.children[0].childId, '3')
    assert.strictEqual(tTest.child.children[0].children[0].childId, '4')
  })

  it('Will create a correct value on untyped objects', async () => {
    const tTest = await TestTomeTopic.create(state, {
      id: '1'
    }, {
      name: 'ohai',
      url: 'http://google.com',
      whatever: {
        a: {
          b: 'hello'
        }
      }
    })

    assert.strictEqual(tTest.whatever.a.b, 'hello')
  })
})
