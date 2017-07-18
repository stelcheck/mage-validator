/* tslint:disable:no-console */
import * as mage from 'mage'
import { Acl } from '../../../src'

let state: mage.core.IState

describe('IncorrectDecoratorUsage', function () {
  beforeEach(() => state = new mage.core.State())

  it('Execution fails if input is invalid', async function () {
    try {
      /**
       * This should throw, because @Acl should only work on the execute
       * method
       *
       * @class IncorrectUserCommand
       */
      class IncorrectUserCommand {
        @Acl('*')
        public static async notExecute(_state: mage.core.IState) {
          return true
        }
      }

      console.log(IncorrectUserCommand)
    } catch (error) {
      return
    }

    throw new Error('User command declaration should have failed')
  })
})
