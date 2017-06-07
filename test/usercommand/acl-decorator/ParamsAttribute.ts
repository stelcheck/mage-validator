/* tslint:disable:no-console */
import * as mage from 'mage'
import * as assert from 'assert'
import { Acl } from '../../../src'

let state: mage.core.IState

describe('Params attribute injection', function () {
  beforeEach(() => state = new mage.core.State())

  it('Params is injected, and contains the signatur', async function () {
    /**
     * We will validate that this user command class gets augmented
     * with a params static attribute; this attribute will be read
     * by MAGE at runtime so that it may know the real names of each
     * parameters.
     *
     * @class UserCommand
     */
    class UserCommand {
      @Acl('*')
      public static async execute(_state: mage.core.IState, _hello: string) {
        return true
      }
    }

    assert.deepEqual((<any> UserCommand).params, ['_hello'])
  })
})
