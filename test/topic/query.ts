import { TestTopic, mockStateArchivistMethod } from './'
import * as assert from 'assert'
import * as mage from 'mage'

let state: mage.core.IState

describe('query', function () {
  beforeEach(() => {
    state = new mage.core.State()
  })

  it('Returns a topic instance', async function () {
    const options = {
      ok: 'computer'
    }
    const queries = [
      { id: '1' }
    ]
    const data = [{
      name: 'hello',
      url: 'https://abc.com'
    }]

    mockStateArchivistMethod(state, 'list', queries, function (topicName: string, index: mage.archivist.IArchivistIndex) {
      assert.equal(topicName, 'TestTopic')
      assert.equal(index.id, 1)
    })

    mockStateArchivistMethod(state, 'mget', data, function (queries: mage.archivist.IArchivistQuery[], opts: any) {
      assert.equal(queries[0].topic, 'TestTopic')
      assert.equal(queries[0].index.id, 1)
      assert.equal(opts.ok, options.ok)
    })

    const topics: TestTopic[] = await TestTopic.query(state, { id: '1' }, options)
    const topic = topics[0]

    assert(topic instanceof TestTopic)
    assert.equal(topic.name, data[0].name)
    assert.equal(topic.url, data[0].url)
  })
})
