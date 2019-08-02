/* tslint:disable:no-console */

import * as assert from 'assert'
import * as mage from 'mage'
import { ValidatedTomeTopic } from '../../src'
import { Type } from 'class-transformer'

import * as util from 'util'

const inspect: any = util.inspect

/**
 * Index
 */
class Index {
  public id: string
}

/**
 * Child class
 *
 * We use this child class to make sure that we return
 * the class name when known (e.g. when @Type is specified)
 */
class SubClass {
  public duper: any
}

/**
 * Test topic
 */
class TestTopic extends ValidatedTomeTopic {
  public static readonly index = ['id']
  public static readonly indexType = Index

  public name: string

  public num: number

  public list: string[]

  @Type(() => SubClass)
  public super: SubClass
}

describe('log, inspect, etc', function () {
  const state = new mage.core.State()

  it('Symbol.toStringTag, toString', async () => {
    const tTest = await TestTopic.create(state, { id: '1' })
    tTest.name = 'my name'
    tTest.list = ['b', 'c']
    tTest.num = 1

    const res = '{"_version":0,"name":"my name","list":["b","c"],"num":1}'
    assert.strictEqual(tTest.toString(), res)
    assert.strictEqual((<any> tTest)[Symbol.toStringTag](), res)
    assert.strictEqual(tTest.list.toString(), '["b","c"]')
  })

  it('Symbol(util.inspect.custom), custom', async () => {
    const tTest = await TestTopic.create(state, { id: '1' })
    tTest.name = 'my name'
    tTest.list = ['b', 'c']

    const res = 'TestTopic -> { _version: 0, name: \'my name\', list: [ \'b\', \'c\' ] }'

    assert.strictEqual((<any> tTest).inspect(0, {}), 'TestTopic -> { _version: 0, name: \'my name\', list: [Array] }')
    assert.strictEqual((<any> tTest).inspect(1, {}), res)
    assert.strictEqual((<any> tTest)[inspect.custom](), res)
  })

  it('console.log', async () => {
    const tTest = await TestTopic.create(state, { id: '1' }, {
      super: {
        duper: {
          nested: [
            '1'
          ]
        }
      }
    })

    console.log(tTest)
    console.log((<any> tTest).super)
    console.log((<any> tTest).super.duper)
    console.log((<any> tTest).super.duper.nested)
  })
})
