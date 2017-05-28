import * as mage from 'mage'
import { Index, TestTopic } from '../'

export { Index, TestTopic }

export function mockStateArchivistMethod(state: mage.core.IState, name: string, data: any, call: Function) {
  // Mocking archivist
  const archivist = (<any> state.archivist)
  archivist[name] = function (...args: any[]) {
    call(...args)

    const callback = args[args.length - 1]
    if (callback instanceof Function) {
      callback(null, data)
    }
  }
}

export function createTopic(state: mage.core.IState, data: any, mock: string, validation: Function): Promise<TestTopic> {
  mockStateArchivistMethod(state, mock, null, validation)
  return TestTopic.create(state, { id: '1' }, data)
}

let state: mage.core.IState
let topic: TestTopic

function fail() {
  throw new Error('Failure expected')
}

describe('Validated Topics', function () {
  beforeEach(() => {
    state = new mage.core.State()
    topic = new TestTopic(state)
  })

  describe('Index validation', function () {
    it('Index fields with validation are validated', function (done) {
      topic.setIndex({ id: 'wrong' }).then(fail).catch(() => done())
    })

    it('Valid indexes do not cause errors', function (done) {
      topic.setIndex({ id: '1' }).then(done).catch(done)
    })
  })

  require('./create')
  require('./execute')
  require('./get')
  require('./mget')
  require('./list')
  require('./query')
  require('./add-set-touch')
  require('./del')
})
