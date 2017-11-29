import { TestTopic } from './'
import * as assert from 'assert'
import * as mage from 'mage'

let state: mage.core.IState

describe('lock, unlock and isLocked', function () {
  let RealState: mage.core.IState

  beforeEach(() => {
    state = new mage.core.State()
    RealState = <any> mage.core.State
  })

  afterEach(() => {
    mage.core.State = <any> RealState
  })

  it('lock will throw if state.archivist.get.fails', async () => {
    const id = '12132341233'
    const message = 'fails'

    mage.core.State = <any> class {
      public archivist = {
        get(_topic: string, _index: any, _cfg: any, cb: any) {
          cb(new Error(message))
        }
      }
    }

    const topic = await TestTopic.create(state, { id })
    try {
      await topic.isLocked()
    } catch (error) {
      return assert.equal(error.message, message)
    }


    throw new Error('did not fail')
  })

  it('isLocked checks if a key is locked', async () => {
    const id = '12132341233'

    mage.core.State = <any> class {
      public archivist = {
        get(topic: string, index: any, cfg: any, cb: any) {
          assert.equal(topic, 'TestTopic')
          assert.equal(index.id, id)
          assert.equal(index.mageValidatorLock, 'locked')
          assert.equal(cfg.optional, true)

          cb(null, 'locked')
        }
      }
    }

    const topic = await TestTopic.create(state, { id })
    const isLocked = await topic.isLocked()

    assert.equal(isLocked, true)
  })

  it('isLocked can take a state as a parameter', async () => {
    const id = '12132341233'

    mage.core.State = <any> class {
      public archivist = {
        get(topic: string, index: any, cfg: any, cb: any) {
          assert.equal(topic, 'TestTopic')
          assert.equal(index.id, id)
          assert.equal(index.mageValidatorLock, 'locked')
          assert.equal(cfg.optional, true)

          cb(null, 'locked')
        }
      }
    }

    const topic = await TestTopic.create(state, { id })
    const isLocked = await topic.isLocked(new mage.core.State())

    assert.equal(isLocked, true)
  })

  it('lock will throw if it fails to get the lock', async () => {
    const id = '12132341233'
    const message = 'fails'

    mage.core.State = <any> class {
      public archivist = {
        get(_topic: string, _index: any, _cfg: any, cb: any) {
          cb(new Error(message))
        }
      }
    }

    const topic = await TestTopic.create(state, { id })
    try {
      await topic.lock()
    } catch (error) {
      return assert.equal(error.message, message)
    }


    throw new Error('did not fail')
  })

  it('lock will throw if the topic is locked', async () => {
    const id = '12132341233'

    mage.core.State = <any> class {
      public archivist = {
        get(topic: string, index: any, cfg: any, cb: any) {
          assert.equal(topic, 'TestTopic')
          assert.equal(index.id, id)
          assert.equal(index.mageValidatorLock, 'locked')
          assert.equal(cfg.optional, true)

          return cb(null, 'locked')
        }
      }
    }

    const topic = await TestTopic.create(state, { id })
    try {
      await topic.lock()
    } catch (error) {
      return assert.equal(error.message, ('Topic is locked'))
    }


    throw new Error('did not fail')
  })

  it('lock will lock, and set autoUnlock operation on the topic state', async () => {
    const id = '1'
    let wasDistributeCalled = false

    mage.core.State = <any> class {
      public archivist = {
        get(_topic: string, _index: any, _cfg: any, cb: any) {
          return cb()
        },
        set(topic: string, index: any, data: any) {
          assert.equal(topic, 'TestTopic')
          assert.equal(index.id, id)
          assert.equal(data, 'locked')
        }
      }

      /* tslint:disable:prefer-function-over-method */
      public distribute(cb: (error?: Error) => void) {
        wasDistributeCalled = true
        cb()
      }
    }

    const topic = await TestTopic.create(state, { id })
    await topic.lock()

    assert(wasDistributeCalled)

    const loaded = (<any> state.archivist).loaded.TestTopicoids1omageValidatorLockslocked
    assert(loaded)
    assert.equal(loaded.operation, 'del')
    assert.equal(loaded.topic, 'TestTopic')
    assert.deepEqual(loaded.index, {
      id,
      mageValidatorLock: 'locked'
    })
  })

  it('lock will not autoUnlock if autoUnlock is set to false', async () => {
    const id = '1'
    let wasDistributeCalled = false

    mage.core.State = <any> class {
      public archivist = {
        get(_topic: string, _index: any, _cfg: any, cb: any) {
          return cb()
        },
        set(topic: string, index: any, data: any) {
          assert.equal(topic, 'TestTopic')
          assert.equal(index.id, id)
          assert.equal(data, 'locked')
        }
      }

      /* tslint:disable:prefer-function-over-method */
      public distribute(cb: (error?: Error) => void) {
        wasDistributeCalled = true
        cb()
      }
    }

    const topic = await TestTopic.create(state, { id })
    await topic.lock(false)

    assert(wasDistributeCalled)

    const loaded = (<any> state.archivist).loaded.TestTopicoids1omageValidatorLockslocked
    assert.equal(loaded, undefined)
  })

  it('lock will fail if it cannot distribute the lock', async () => {
    const id = '1'
    const message = 'oh maimai'

    mage.core.State = <any> class {
      public archivist = {
        get(_topic: string, _index: any, _cfg: any, cb: any) {
          return cb()
        },
        set(topic: string, index: any, data: any) {
          assert.equal(topic, 'TestTopic')
          assert.equal(index.id, id)
          assert.equal(data, 'locked')
        }
      }

      /* tslint:disable:prefer-function-over-method */
      public distribute(cb: (error?: Error) => void) {
        cb(new Error(message))
      }
    }

    const topic = await TestTopic.create(state, { id })
    try {
      await topic.lock()
    } catch (error) {
      return assert.equal(error.message, message)
    }

    throw new Error('did not fail')
  })

  it('unlock deletes the lock immediately', async () => {
    const id = '1'
    let wasDelCalled = false
    let wasDistributeCalled = false

    mage.core.State = <any> class {
      public archivist = {
        del(topic: string, index: any) {
          wasDelCalled = true
          assert.equal(topic, 'TestTopic')
          assert.equal(index.id, id)
        }
      }

      /* tslint:disable:prefer-function-over-method */
      public distribute(cb: (error?: Error) => void) {
        wasDistributeCalled = true
        cb()
      }
    }

    const topic = await TestTopic.create(state, { id })
    await topic.unlock()

    assert(wasDelCalled)
    assert(wasDistributeCalled)
  })
})
