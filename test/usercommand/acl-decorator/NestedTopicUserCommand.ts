import * as assert from 'assert'
import * as mage from 'mage'
import { Acl, ValidatedTopic } from '../../../src'
import { IsNumberString, IsInt, Min, Max, ValidateNested } from 'class-validator';

export class Index {
  @IsNumberString()
  id: string
}

class NestedTopic extends ValidatedTopic {
  public static readonly index = ['id']
  public static readonly indexType = Index

  @Min(1)
  @Max(3)
  count: number
}

class NestedTopicUserCommand {
  @IsInt()
  public increment: number

  @ValidateNested()
  public data: NestedTopic

  @Acl('*')
  public static async execute(state: mage.core.IState, data: NestedTopic, increment: number) {
    console.log(state)
    data.count += increment
    return data
  }
}

let state: mage.core.IState

describe('NestedTopicUserCommand', function () {
  beforeEach(() => state = new mage.core.State())

  const exec: any = NestedTopicUserCommand.execute


  it('Nested data is validated upon input', async function () {
    try {
      await exec(state, {
        index: { id: '1' },
        count: 0
      }, 1)
    } catch (error) {
      return
    }

    return new Error('Command should have failed upon input validation')
  })

  it('Output data structures are validated upon return', async function () {
    try {
      await exec(state, {
        index: { id: '1' },
        count: 1
      }, 5)
    } catch (error) {
      return
    }

    return new Error('Command should have failed upon output validation')
  })

  it('Topic index is validated', async function () {
    try {
      await exec(state, {
        index: { id: 'not a number string' },
        count: 1
      }, 1)
    } catch (error) {
      return
    }

    return new Error('Command should have failed upon output validation')
  })

  it('If index is missing, we default to an empty index', async function () {
    try {
      await exec(state, {
        count: 1
      }, 1)
    } catch (error) {
      return
    }

    return new Error('Command should have failed upon output validation')
  })

  it('Valid data structures are returned', async function () {
    const ret = await exec(state, {
      index: { id: '1' },
      count: 1
    }, 1)

    assert(ret instanceof NestedTopic)
    assert.equal(ret.count, 2)
  })
})
