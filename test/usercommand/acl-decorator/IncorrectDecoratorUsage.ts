import * as mage from 'mage'
import { Acl } from '../../../src'

let state: mage.core.IState

describe('IncorrectDecoratorUsage', function () {
  beforeEach(() => state = new mage.core.State())

  it('Execution fails if input is invalid', async function () {
    try {
      class IncorrectUserCommand {
        @Acl('*')
        public static async notExecute(state: mage.core.IState) {
          console.log(state)
          return true
        }
      }

      console.log(IncorrectUserCommand )
    } catch (error) {
      return
    }

    return new Error('User command declaration should have failed')
  })
})
