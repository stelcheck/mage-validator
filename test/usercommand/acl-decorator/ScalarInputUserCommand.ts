import * as assert from 'assert'
import * as mage from 'mage'
import { Acl } from '../../../src'
import { Min } from 'class-validator';

class ScalarInputUserCommand {
  @Min(1)
  public gemRegisterBonus: number

  @Acl('*')
  public static async execute(state: mage.core.IState, gemRegisterBonus: number) {
    console.log(state)
    return gemRegisterBonus
  }
}

let state: mage.core.IState

describe('ScalarInputUserCommand', function () {
  beforeEach(() => state = new mage.core.State())

  it('Execution fails if input is invalid', async function () {
    try {
      await ScalarInputUserCommand.execute(state, 0)
    } catch (error) {
      return
    }

    return new Error('User command validation should have failed')
  })

  it('Execution succeeds if input is valid', async function () {
    const ret = await ScalarInputUserCommand.execute(state, 1)
    assert.equal(ret, 1)
  })
})
