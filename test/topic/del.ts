import * as assert from 'assert'
import { createTopic } from './'
import * as mage from 'mage'

describe('del', function () {
  it('calls delete on attached state.archivist', async function () {
    const state = new mage.core.State()
    const topic = await createTopic(state, {}, 'del', function (topicName: string, index: any) {
      assert.equal(topicName, 'TestTopic')
      assert.equal(index.id, '1')
    })

    topic.del()
  })
})
