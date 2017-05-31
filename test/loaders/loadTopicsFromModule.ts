import * as assert from 'assert'
import { loadTopicsFromModule } from '../../src'

describe('loadTopicsFromModule', function () {
  it('Throws if the module does not exist', function () {
    const exports = {}
    loadTopicsFromModule(exports, 'moduleZero')
  })

  it('Does nothing if the module does not have a topics folder', function () {
    const exports = {}
    loadTopicsFromModule(exports, 'moduleOne')

    assert.deepEqual(exports, {})
  })

  it('Does nothing if the module has an empty topics folder', function () {
    const exports = {}
    loadTopicsFromModule(exports, 'moduleTwo')

    assert.deepEqual(exports, {})
  })

  it('Throws an error if a topic is already defined', async function () {
    const exports = {
      topicOne: class {
        /// topic class
      }
    }

    try {
      loadTopicsFromModule(exports, 'moduleThree')
    } catch (error) {
      return
    }

    return new Error('topics loading should have failed')
  })

  it('Loads topics (and ignores JavaScript files)', function () {
    const exports = {}
    loadTopicsFromModule(exports, 'moduleThree')

    assert.deepEqual(exports, {
      topicOne: require('../fixtures/lib/modules/moduleThree/topics/topicOne').default
    })
  })
})
