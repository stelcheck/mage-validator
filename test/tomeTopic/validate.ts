import * as mage from 'mage'
import * as assert from 'assert'

import { ValidatedTomeTopic } from '../../src'
import { IsNumberString, IsUrl, validate, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

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

  @IsNumberString({
    each: true
  })
  public list: string[]

  public untypedChild: TestTome
}

describe('validate', function () {
  const state = new mage.core.State()

  it('top-level attribute validation - valid data', async () => {
    const tTest = await TestTomeTopic.create(state, { id: '1' })
    tTest.url = 'https://google.com'

    await tTest.validate()
  })

  it('top-level attribute validation - invalid data', async () => {
    const tTest = await TestTomeTopic.create(state, { id: '1' })
    tTest.url = 'hi'

    try {
      await tTest.validate()
    } catch (error) {
      return assert.strictEqual(error.message, 'Invalid type')
    }

    throw new Error('Did not throw')
  })

  it('child object attribute validation - valid data', async () => {
    const tTest = await TestTomeTopic.create(state, { id: '1' })
    tTest.url = 'https://google.com'

    const child = (<any> new TestTome())
    child.childId = '1'
    tTest.child = child

    await tTest.validate()
  })

  it('child object attribute validation - invalid data', async () => {
    const tTest = await TestTomeTopic.create(state, { id: '1' })
    const child = (<any> new TestTome())
    child.childId = 'not a string number'
    tTest.child = child

    try {
      await tTest.validate()
    } catch (error) {
      return assert.strictEqual(error.message, 'Invalid type')
    }

    throw new Error('Did not throw')
  })

  it('child array attribute validation - valid data', async () => {
    const tTest = await TestTomeTopic.create(state, { id: '1' })
    tTest.url = 'https://google.com'
    tTest.list = ['1']

    await tTest.validate()
  })

  it('child array attribute validation - invalid data', async () => {
    const tTest = await TestTomeTopic.create(state, { id: '1' })
    tTest.list = ['invalid']

    try {
      await tTest.validate()
    } catch (error) {
      return assert.strictEqual(error.message, 'Invalid type')
    }

    throw new Error('Did not throw')
  })

  it('child array of object attribute validation - valid data', async () => {
    const tTest = await TestTomeTopic.create(state, { id: '1' })
    tTest.url = 'https://google.com'
    tTest.children = []

    const child = (<any> new TestTome())
    child.childId = '1'

    tTest.children.push(child)

    await tTest.validate()
  })

  it('child array of object attribute validation - invalid data', async () => {
    const tTest = await TestTomeTopic.create(state, { id: '1' })
    tTest.url = 'https://google.com'
    tTest.children = []

    const child = (<any> new TestTome())
    child.childId = 'not a string number'

    tTest.children.push(child)

    try {
      await tTest.validate()
    } catch (error) {
      return assert.strictEqual(error.message, 'Invalid type')
    }

    throw new Error('Did not throw')
  })

  it('adding a typed value to a validated tome attribute and validating that attribute should work', async () => {
    const tTest = await TestTomeTopic.create(state, { id: '1' })
    const child = (<any> new TestTome())
    child.childId = 'not a string number'

    tTest.untypedChild = child

    const errors = await validate(tTest.untypedChild)
    assert.equal(errors.length, 1)
  })
})
