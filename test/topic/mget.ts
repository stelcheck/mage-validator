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
      assert.equal(queries[0].topic, 'TestTopic')
      assert.equal(queries[0].index.id, 1)
      assert.equal(opts, null)
    })

    const topics: TestTopic[] = await TestTopic.mget(state, [{ id: '1' }])
    const topic = topics[0]

    assert(topic instanceof TestTopic)
    assert.equal(topic.name, data[0].name)
    assert.equal(topic.url, data[0].url)
  })

  it('Options are passed to state.archivist.mget', async function () {
    const data: any[] = []
    const options = {
      ok: 'computer'
    }

    mockStateArchivistMethod(state, 'mget', data, function (queries: mage.archivist.IArchivistQuery[], opts: any) {
      assert.equal(queries[0].topic, 'TestTopic')
      assert.equal(queries[0].index.id, 1)
      assert.equal(opts.ok, options.ok)
    })

    return await TestTopic.mget(state, [{ id: '1' }], options)
  })
})
