import { TestTopic, mockStateArchivistMethod } from './'
import * as assert from 'assert'
import * as mage from 'mage'

let state: mage.core.IState

describe('tryGet', function () {
  beforeEach(() => {
    state = new mage.core.State()
  })

  it('Sets the optional option to true', async function () {
    mockStateArchivistMethod(state, 'get', null, function (_topicName: string, _index: any, opts: any) {
      assert.strictEqual(opts.optional, true)
    })

    return await TestTopic.tryGet(state, { id: '1' })
  })

  it('Forces the optional option to true', async function () {
    const options = {
      optional: false
    }

    mockStateArchivistMethod(state, 'get', null, function (_topicName: string, _index: any, opts: any) {
      assert.strictEqual(opts.optional, true)
    })

    return await TestTopic.tryGet(state, { id: '1' }, options)
  })
})
