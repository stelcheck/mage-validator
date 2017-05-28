import { TestTopic, mockStateArchivistMethod } from './'
import * as assert from 'assert'
import * as mage from 'mage'

let state: mage.core.IState

describe('get', function () {
  beforeEach(() => {
    state = new mage.core.State()
  })

  it('Returns a topic instance', async function () {
    const data = {
      name: 'hello',
      url: 'https://abc.com'
    }

    mockStateArchivistMethod(state, 'get', data, function (topicName: string, index: any, opts: any) {
      assert.equal(topicName, 'TestTopic')
      assert.equal(index.id, 1)
      assert.equal(opts, null)
    })

    const topic: TestTopic = await TestTopic.get(state, { id: '1' })
    assert(topic instanceof TestTopic)
    assert.equal(topic.name, data.name)
    assert.equal(topic.url, data.url)
  })

  it('Options are passed to state.archivist.get', async function () {
    const options = {
      ok: 'computer'
    }

    mockStateArchivistMethod(state, 'get', null, function (topicName: string, index: any, opts: any) {
      assert.equal(topicName, 'TestTopic')
      assert.equal(index.id, 1)
      assert.equal(opts.ok, options.ok)
    })

    return await TestTopic.get(state, { id: '1' }, options)
  })
})
