/* tslint:disable:no-console */
import * as mage from 'mage'
import * as assert from 'assert'
import { Acl } from '../../../src'

const sinon = require('sinon')

let reflectStub: any

describe('MisconfiguredTsconfig', function () {
  before(() => {
    reflectStub  = sinon.stub(Reflect, 'getMetadata').returns(null)
  })

  after(() => {
    reflectStub.restore()
  })

  // If experimentalDecorators or emitDecoratorMetadata are not set
  // in tsconfig.json, Reflect.getMetadata returns null
  //
  // We test it correctly throws an error in this case
  it('Throws an error if tsconfig is misconfigured', async function () {
    try {
    /**
     * Empty class for testing purpose
     *
     * @class UserCommand
     */
      class UserCommand {
        @Acl('*')
        public static async execute(_state: mage.core.IState) {
          return true
        }
      }
      assert(UserCommand)
    } catch (err) {
      return
    }

    throw new Error('Should throw an error')
  })
})
