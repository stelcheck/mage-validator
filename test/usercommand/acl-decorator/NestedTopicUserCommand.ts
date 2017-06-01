/* tslint:disable:no-console */
import * as assert from 'assert'
import * as mage from 'mage'
import { Acl, ValidatedTopic, ValidationError } from '../../../src'
import { IsDefined, IsNumberString, IsInt, Min, Max, ValidateNested } from 'class-validator'

/**
 * Index
 *
 * @export
 * @class Index
 */
export class Index {
  @IsNumberString()
  public id: string
}

/**
 * Topic to be used in our user commands
 *
 * @class NestedTopic
 * @extends {ValidatedTopic}
 */
class NestedTopic extends ValidatedTopic {
  public static readonly index = ['id']
  public static readonly indexType = Index

  @Min(1)
  @Max(3)
  public count: number
}

/**
 * User command which receives a Topic as a parameter
 *
 * @class NestedTopicUserCommand
 */
class NestedTopicUserCommand {
  @IsInt()
  public increment: number

  @IsDefined()
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

  it('Undefined topic parameters are properly validated', async function () {
    try {
      await exec(state, undefined, 1)
    } catch (error) {
      assert(error instanceof ValidationError)
      return
    }

    return new Error('Command should have failed upon input validation')
  })

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
