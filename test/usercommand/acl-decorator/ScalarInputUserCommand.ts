/* tslint:disable:no-console */
import * as assert from 'assert'
import * as mage from 'mage'
import { Acl } from '../../../src'
import { IsBoolean, Min, MinLength } from 'class-validator'

/**
 * User command receiving only JS literals
 *
 * @class ScalarInputUserCommand
 */
class ScalarInputUserCommand {
  @Min(1)
  public gemRegisterBonus: number

  @Acl('*')
  public static async execute(state: mage.core.IState, gemRegisterBonus: number) {
    console.log(state)
    return gemRegisterBonus
  }
}

/**
 * String input/output
 */
class StringUserCommand {
  @MinLength(1)
  public text: number

  @Acl('*')
  public static async execute(_state: mage.core.IState, text: string) {
    return text
  }
}

/**
 * Boolean input/output
 */
class BooleanUserCommand {
  @IsBoolean()
  public yes: number

  @Acl('*')
  public static async execute(_state: mage.core.IState, yes: boolean) {
    return !yes
  }
}

let state: mage.core.IState

describe('ScalarInputUserCommand', function () {
  beforeEach(() => { state = new mage.core.State() })

  it('Execution fails if input is invalid', async function () {
    try {
      await ScalarInputUserCommand.execute(state, 0)
    } catch (error) {
      return
    }

    throw new Error('User command validation should have failed')
  })

  it('Execution succeeds if input is valid (string input/output)', async function () {
    const ret = await StringUserCommand.execute(state, 'hello')
    assert.strictEqual(ret, 'hello')
  })

  it('Execution succeeds if input is valid (boolean input/output)', async function () {
    const ret = await BooleanUserCommand.execute(state, true)
    assert.strictEqual(ret, false)
  })
})
