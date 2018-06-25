/* tslint:disable:no-console */
import * as assert from 'assert'
import * as mage from 'mage'
import { Acl } from '../../../src'
import { IsString } from 'class-validator'

/**
 * User command which receives typed data as a parameter
 *
 * @class NestedDataUserCommand
 */
class NestedScalarUserCommand {
  @IsString({ each: true })
  public data: string[]

  @Acl('*')
  public static async execute(_state: mage.core.IState, data: string[], insert: string) {
    data.push(insert)

    return data
  }
}

/**
 * User command which receives an array of typed data as a parameter
 *
 * @class NestedDataUserCommand
 */
class NestedArrayUserCommand {
  @IsString({ each: true })
  public data: string[][]

  @Acl('*')
  public static async execute(_state: mage.core.IState, data: string[][], insert: string) {
    data.push([insert])

    return data
  }
}

let state: mage.core.IState

describe('NestedScalarUserCommand', function () {
  beforeEach(() => { state = new mage.core.State() })

  it('Nested data is validated upon input', async function () {
    try {
      await NestedScalarUserCommand.execute(state, [1] as any, 'insert')
    } catch (error) {
      return
    }

    throw new Error('Command should have failed upon input validation')
  })

  it('Valid data structures are returned', async function () {
    const ret = await NestedScalarUserCommand.execute(state, [], 'insert')
    assert.strictEqual(ret[0], 'insert')
  })

  it('Nested array is validated upon input', async function () {
    try {
      await NestedArrayUserCommand.execute(state, [[1]] as any, 'insert')
    } catch (error) {
      console.log(error.details)
      return
    }

    throw new Error('Command should have failed upon input validation')
  })

  it('Valid array data structures are returned', async function () {
    const ret = await NestedArrayUserCommand.execute(state, [], 'insert')
    assert.strictEqual(ret[0][0], 'insert')
  })
})
