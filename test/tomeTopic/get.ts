import * as mage from 'mage'
import * as assert from 'assert'

import { ValidatedTomeTopic } from '../../src'
import { IsNumberString, IsUrl, ValidateNested } from 'class-validator'
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

  public untypedChild: TestTome = new TestTome()
}

describe('get', () => {
  const state = new mage.core.State()

  it('if a nested object is not present, the attribute is set to undefined and is not iteratable', async () => {
    const child = new TestTome()
    child.childId = '1'
    mockStateArchivistMethod(state, 'get', {
      url: 'http://google.com/'
    }, function (topicName: string, index: any, opts: any) {
      assert.strictEqual(topicName, 'TestTomeTopic')
      assert.strictEqual(index.id, '1')
      assert.strictEqual(opts, undefined)
    })

    const index =  { id: '1' }
    const tTest = await TestTomeTopic.get(state, index)

    assert.strictEqual(tTest.untypedChild, undefined)
    await tTest.set()
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
