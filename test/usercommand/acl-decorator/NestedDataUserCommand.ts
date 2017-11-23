/* tslint:disable:no-console */
import * as assert from 'assert'
import * as mage from 'mage'
import { Acl } from '../../../src'
import { IsInt, Min, Max, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

/**
 * Nested data
 *
 * @class NestedData
 */
class NestedData {
  @Min(1)
  @Max(3)
  public count: number
}

/**
 * User command which receives typed data as a parameter
 *
 * @class NestedDataUserCommand
 */
class NestedDataUserCommand {
  @IsInt()
  public increment: number

  @ValidateNested()
  @Type(() => NestedData)
  public data: NestedData

  @Acl('*')
  public static async execute(_state: mage.core.IState, data: NestedData, increment: number) {
    data.count += increment
    console.log(data)
    return data
  }
}

/**
 * User command which receives an array of typed data as a parameter
 *
 * @class NestedDataUserCommand
 */
class NestedArrayUserCommand {
  @IsInt()
  public increment: number

  @ValidateNested()
  @Type(() => NestedData)
  public data: NestedData[]

  @Acl('*')
  public static async execute(_state: mage.core.IState, data: NestedData[], increment: number) {
    data[0].count += increment
    return data
  }
}

let state: mage.core.IState

describe('NestedDataUserCommand', function () {
  beforeEach(() => state = new mage.core.State())

  it('Nested data is validated upon input', async function () {
    try {
      await NestedDataUserCommand.execute(state, <NestedData> { count: 0 }, 1)
    } catch (error) {
      return
    }

    throw new Error('Command should have failed upon input validation')
  })

  it('Output data structures are validated upon return', async function () {
    try {
      await NestedDataUserCommand.execute(state, <NestedData> { count: 1 }, 5)
    } catch (error) {
      console.log(error.message, error.details, error.stack)
      return
    }

    throw new Error('Command should have failed upon output validation')
  })

  it('Valid data structures are returned', async function () {
    const ret = await NestedDataUserCommand.execute(state, <NestedData> { count: 1 }, 1)
    assert(ret instanceof NestedData)
    assert.equal(ret.count, 2)
  })

  it('Nested array is validated upon input', async function () {
    try {
      await NestedArrayUserCommand.execute(state, <NestedData[]> [{ count: 0 }], 1)
    } catch (error) {
      console.log(error.details)
      return
    }

    throw new Error('Command should have failed upon input validation')
  })

  it('Output data structures are validated upon return', async function () {
    try {
      await NestedArrayUserCommand.execute(state, <NestedData[]> [{ count: 1 }], 5)
    } catch (error) {
      return
    }

    throw new Error('Command should have failed upon output validation')
  })

  it('Valid array data structures are returned', async function () {
    const ret = await NestedArrayUserCommand.execute(state, <NestedData[]> [{ count: 1 }], 1)
    assert(ret[0] instanceof NestedData)
    assert.equal(ret[0].count, 2)
  })
})
