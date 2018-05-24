import { TestTopic } from './'
import * as assert from 'assert'
import * as mage from 'mage'

let state: mage.core.IState

describe('create', function () {
  beforeEach(() => {
    state = new mage.core.State()
  })

  it('Returns a topic instance', async function () {
    const topic = await TestTopic.create(state, { id: '1' })
    assert(topic instanceof TestTopic)
  })

  it('Validates index', async function () {
    try {
      await TestTopic.create(state, { id: 'wrong' })
    } catch (error) {
      return
    }

    throw new Error('Did not fail')
  })

  it('Create a new instance without data', async function () {
    const topic = await TestTopic.create(state, { id: '1' })
    assert.strictEqual(topic.name, undefined)
    assert.strictEqual(topic.url, undefined)
  })

  it('Non-objects value for index causes an error', async function () {
    try {
      await TestTopic.create(state, <{}> true)
    } catch (error) {
      assert.strictEqual(error.message, 'Index validation failed')
      return
    }

    throw new Error('Error expected')
  })

  it('Attributes are properly attached', async function () {
    const topic = await TestTopic.create(state, { id: '1' }, {
      name: 'hi',
      url: 'https://google.com',
    })

    assert.strictEqual(topic.name, 'hi')
    assert.strictEqual(topic.url, 'https://google.com')
  })

  it('Non-objects data cause an error', async function () {
    try {
      await TestTopic.create(state, { id: '1' }, [] as any)
    } catch (error) {
      assert.strictEqual(error.message, 'Received data is not an object (received [])')
      return
    }

    throw new Error('Error expected')
  })

  it('Validation will work properly', async function () {
    const topic: TestTopic = await TestTopic.create(state, { id: '1' }, {
      name: 'hi',
      url: 'I am not a url'
    })

    try {
      await topic.validate()
    } catch (error) {
      return
    }

    throw new Error('Validation did not fail')
  })
})
