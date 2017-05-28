import * as assert from 'assert'
import { loadTopicsFromModules } from '../../src'

describe('loadTopicsFromModules', function () {
  it('Loads all topics from all modules (and ignores JavaScript files)', function () {
    const exports = {}
    loadTopicsFromModules(exports)

    assert.deepEqual(exports, {
      topicOne: require('../fixtures/lib/modules/moduleThree/topics/topicOne')
    })
  })
})
