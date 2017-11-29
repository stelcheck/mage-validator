import * as mage from 'mage'
import { Index, TestTopic } from '../'

export { Index, TestTopic }

export function mockStateArchivistMethod(state: mage.core.IState, name: string, data: any, call?: (...args: any[]) => any) {
  // Mocking archivist
  const archivist = (<any> state.archivist)
  archivist[name] = function (...args: any[]) {
    if (call) {
      call(...args)
    }

    const callback = args[args.length - 1]
    if (callback instanceof Function) {
      callback(null, data)
    }
  }
}

export async function createTopic(state: mage.core.IState, data: any, mock: string, validation: (...args: any[]) => any): Promise<TestTopic> {
  mockStateArchivistMethod(state, mock, null, validation)
  return TestTopic.create(state, { id: '1' }, data)
}

let state: mage.core.IState
let topic: TestTopic

describe('Validated Topics', function () {
  beforeEach(() => {
    state = new mage.core.State()
    topic = new TestTopic(state)
  })

  describe('Index validation', function () {
    it('Index fields with validation are validated', async function () {
      try {
        await topic.setIndex({ id: 'wrong' })
      } catch (error) {
        return
      }

      return new Error('failure expected')
    })

    it('Valid indexes do not cause errors', async function () {
      await topic.setIndex({ id: '1' })
    })
  })

  require('./create')
  require('./execute')
  require('./get')
  require('./tryGet')
  require('./mget')
  require('./list')
  require('./query')
  require('./add-set-touch')
  require('./del')
  require('./type-decorator')
  require('./lock-unlock')
})
