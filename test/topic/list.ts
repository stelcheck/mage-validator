import { TestTopic, mockStateArchivistMethod } from './'
import * as assert from 'assert'
import * as mage from 'mage'

let state: mage.core.IState

describe('list', function () {
  beforeEach(() => {
    state = new mage.core.State()
  })

  it('Returns an array of indexes', async function () {
    const options = {
      chunk: [0, 10]
    }

    const data: mage.archivist.IArchivistIndex[]  = [{
      id: '1', complete: 'index'
    }]

    mockStateArchivistMethod(state, 'list', data, function (topicName: string, partialIndex: mage.archivist.IArchivistIndex, opts: any) {
      assert.strictEqual(topicName, 'TestTopic')
      assert.strictEqual(partialIndex.id, '1')
      assert.strictEqual(opts.chunk[0], options.chunk[0])
      assert.strictEqual(opts.chunk[1], options.chunk[1])
    })

    const indexes: mage.archivist.IArchivistIndex[] = await TestTopic.list(state, { sdasd: '1', id: '1' }, options)
    const index = indexes[0]

    assert.strictEqual(index.id, data[0].id)
    assert.strictEqual(index.complete, data[0].complete)
  })
})
