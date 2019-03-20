import * as mage from 'mage'

const { Tome } = mage.require('tomes')

export function mockStateArchivistMethod(state: mage.core.IState, name: string, data: any, call?: (...args: any[]) => any) {
  // Mocking archivist
  const archivist = (<any> state.archivist)
  archivist[name] = function (...args: any[]) {
    if (call) {
      call(...args)
    }

    const callback = args[args.length - 1]
    if (callback instanceof Function) {
      callback(null, Tome.conjure(data))
    }
  }
}

describe('tome topics', function () {
  require('./create')
  require('./get')
  require('./mutate')
  require('./delete')
  require('./iterate')
  require('./validate')
  require('./log')
})
