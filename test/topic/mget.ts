import { TestTopic, mockStateArchivistMethod } from './'
import * as assert from 'assert'
import * as mage from 'mage'

let state: mage.core.IState

describe('mget', function () {
  beforeEach(() => {
    state = new mage.core.State()
  })

  it('Returns a topic instance', async function () {
    const data = [{
      name: 'hello',
      url: 'https://abc.com'
    }]

    mockStateArchivistMethod(state, 'mget', data, function (queries: mage.archivist.IArchivistQuery[], opts: any) {
      assert.strictEqual(queries[0].topic, 'TestTopic')
      assert.strictEqual(queries[0].index.id, '1')
      assert.strictEqual(opts, undefined)
    })

    const topics: TestTopic[] = await TestTopic.mget(state, [{ id: '1' }])
    const topic = topics[0]

    assert(topic instanceof TestTopic)
    assert.strictEqual(topic.name, data[0].name)
    assert.strictEqual(topic.url, data[0].url)
  })

  it('Options are passed to state.archivist.mget', async function () {
    const data: any[] = []
    const options = {
      optional: true
    }

    mockStateArchivistMethod(state, 'mget', data, function (queries: mage.archivist.IArchivistQuery[], opts: any) {
      assert.strictEqual(queries[0].topic, 'TestTopic')
      assert.strictEqual(queries[0].index.id, '1')
      assert.strictEqual(opts.optional, options.optional)
    })

    return await TestTopic.mget(state, [{ id: '1' }], options)
  })
})
