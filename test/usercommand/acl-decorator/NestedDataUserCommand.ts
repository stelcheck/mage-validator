import * as assert from 'assert'
import * as mage from 'mage'
import { Acl } from '../../../src'
import { IsInt, Min, Max, ValidateNested } from 'class-validator';

class NestedData {
  @Min(1)
  @Max(3)
  count: number
}

class NestedDataUserCommand {
  @IsInt()
  public increment: number

  @ValidateNested()
  public data: NestedData

  @Acl('*')
  public static async execute(state: mage.core.IState, data: NestedData, increment: number) {
    console.log(state)
    data.count += increment
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

    return new Error('Command should have failed upon input validation')
  })

  it('Output data structures are validated upon return', async function () {
    try {
      await NestedDataUserCommand.execute(state, <NestedData> { count: 1 }, 5)
    } catch (error) {
      return
    }

    return new Error('Command should have failed upon output validation')
  })

  it('Valid data structures are returned', async function () {
    const ret = await NestedDataUserCommand.execute(state, <NestedData> { count: 1 }, 1)
    assert(ret instanceof NestedData)
    assert.equal(ret.count, 2)
  })
})
