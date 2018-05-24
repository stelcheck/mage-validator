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
      optional: true
    }
    const queriesArray = [
      { id: '1' }
    ]
    const data = [{
      name: 'hello',
      url: 'https://abc.com'
    }]

    mockStateArchivistMethod(state, 'list', queriesArray, function (topicName: string, index: mage.archivist.IArchivistIndex) {
      assert.strictEqual(topicName, 'TestTopic')
      assert.strictEqual(index.id, '1')
    })

    mockStateArchivistMethod(state, 'mget', data, function (queries: mage.archivist.IArchivistQuery[], opts: any) {
      assert.strictEqual(queries[0].topic, 'TestTopic')
      assert.strictEqual(queries[0].index.id, '1')
      assert.strictEqual(opts.optional, options.optional)
    })

    const topics: TestTopic[] = await TestTopic.query(state, { id: '1' }, options)
    const topic = topics[0]

    assert(topic instanceof TestTopic)
    assert.strictEqual(topic.name, data[0].name)
    assert.strictEqual(topic.url, data[0].url)
  })
})
