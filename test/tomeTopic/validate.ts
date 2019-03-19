import * as mage from 'mage'
import * as assert from 'assert'

import { ValidatedTomeTopic } from '../../src'
import { IsNumberString, IsUrl, validate, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

import { mockStateArchivistMethod } from './'

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

  public setChildId(id: string) {
    this.childId = id
  }
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
  const errorMessage = 'Validation failed'

  async function assertFailedValidation(tTest: TestTomeTopic) {
    try {
      await tTest.validate(errorMessage)
    } catch (error) {
      return assert.strictEqual(error.message, errorMessage)
    }

    throw new Error('Did not throw')
  }

  it('top-level attribute validation - valid data', async () => {
    const tTest = await TestTomeTopic.create(state, { id: '1' })
    tTest.url = 'https://google.com'

    await tTest.validate()
  })

  it('top-level attribute validation - invalid data', async () => {
    const tTest = await TestTomeTopic.create(state, { id: '1' })
    tTest.url = 'hi'

    await assertFailedValidation(tTest)
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

    await assertFailedValidation(tTest)
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

    await assertFailedValidation(tTest)
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

    await assertFailedValidation(tTest)
  })

  it('adding a typed value to a validated tome attribute and validating that attribute should work', async () => {
    const tTest = await TestTomeTopic.create(state, { id: '1' })
    const child = (<any> new TestTome())
    child.childId = 'not a string number'

    tTest.untypedChild = child

    const errors = await validate(tTest.untypedChild)
    assert.strictEqual(errors.length, 1)
  })

  it('set and get will return properly deserialized objects (array)', async () => {
    const child = new TestTome()
    child.childId = '1'
    mockStateArchivistMethod(state, 'get', {
      url: 'http://google.com/',
      children: [child]
    }, function (topicName: string, index: any, opts: any) {
      assert.strictEqual(topicName, 'TestTomeTopic')
      assert.strictEqual(index.id, '1')
      assert.strictEqual(opts, undefined)
    })

    const index =  { id: '1' }
    const tTest = await TestTomeTopic.get(state, index)
    const fetchedChild = tTest.children.pop()
    if (fetchedChild) {
      fetchedChild.setChildId('2')
      assert.strictEqual(fetchedChild.childId, '2')
    }
  })

  it('set and get will return properly deserialized objects (nested)', async () => {
    const child = new TestTome()
    child.childId = '1'
    mockStateArchivistMethod(state, 'get', {
      url: 'http://google.com/',
      child
    }, function (topicName: string, index: any, opts: any) {
      assert.strictEqual(topicName, 'TestTomeTopic')
      assert.strictEqual(index.id, '1')
      assert.strictEqual(opts, undefined)
    })

    const index =  { id: '1' }
    const tTest = await TestTomeTopic.get(state, index)
    tTest.child.setChildId('2')
    assert.strictEqual(tTest.child.childId, '2')
  })
})
