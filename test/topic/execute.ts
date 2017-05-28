/* tslint:disable:no-console */
import { TestTopic } from './'
import * as assert from 'assert'
import * as mage from 'mage'

let state: mage.core.IState

describe('execute', function () {
  beforeEach(() => {
    state = new mage.core.State()
  })

  it('state.archivist errors are correctly returned', async function () {
    const error = new Error('failed')
    const archivist: any = state.archivist

    archivist.fakeCall = function (callback: (error: Error) => void) {
      return callback(error)
    }

    try {
      await TestTopic.execute(state, 'fakeCall', [], function () {
        throw new Error('execute call did not fail')
      })
    } catch (error) {
      console.log(error.message)
      assert(error instanceof Error)
      assert.equal(error.message, 'failed')
    }
  })
})
