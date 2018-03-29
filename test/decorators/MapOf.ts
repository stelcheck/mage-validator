
import * as assert from 'assert'
import * as mage from 'mage'
import {
  ValidatedTopic,
  ValidateNested,
  Type,
  MapOf,
  IsPositive
} from '../../src'

/**
 * Key value children
 */
class Child {
  @IsPositive()
  public id: number
}

/**
 * Map class
 */
@MapOf(Child)
class DynamicMap {
  [key: string]: Child
}

/**
 * Topic class
 */
class TestTopic extends ValidatedTopic {
  public static readonly index = ['id']
  public static readonly indexType = class {
    public id: string
  }

  @Type(DynamicMap)
  @ValidateNested()
  public map: DynamicMap

  @MapOf(Child, (key: string) => {
    if (key === 'badkey') {
      throw new Error('bad key')
    }
  })
  public anonymousMap: { [key: string]: Child }
}

describe('MapOf', () => {
  let state: mage.core.IState

  beforeEach(() => state = new mage.core.State())

  it('casts data on load', async () => {
    const instance = await TestTopic.create(state, { id: 'test' }, {
      map: {
        child: { id: 1 }
      }
    })

    console.warn(instance)

    const { map } = instance
    const { child } = map

    assert.equal(map.constructor.name, 'DynamicMap')
    assert.equal(child.constructor.name, 'Child')
  })

  it('map object can be anonymous', async () => {
    const instance = await TestTopic.create(state, { id: 'test' }, {
      anonymousMap: {
        child: { id: 1 }
      }
    })

    console.warn(instance)

    const { anonymousMap: map } = instance
    const { child } = map

    assert.equal(map.constructor.name, 'Object')
    assert.equal(child.constructor.name, 'Child')
  })

  it('validates data correctly', async () => {
    const instance = await TestTopic.create(state, { id: 'test' }, {
      map: {
        child: { id: 1 }
      }
    })

    await instance.validate()
    instance.map.child.id = -11

    try {
      await instance.validate()
    } catch (error) {
      console.warn(error)
      return assert.equal(error.validationErrors.length, 1)
    }

    throw new Error('Validation did not fail')
  })

  it('anonymous validates data correctly', async () => {
    const instance = await TestTopic.create(state, { id: 'test' }, {
      anonymousMap: {
        child: { id: 1 }
      }
    })

    await instance.validate()
    instance.anonymousMap.child.id = -11

    try {
      await instance.validate()
    } catch (error) {
      console.warn(error)
      return assert.equal(error.validationErrors.length, 1)
    }

    throw new Error('Validation did not fail')
  })

  it('a validation function can be used with @MapOf', async () => {
    const instance = await TestTopic.create(state, { id: 'test' }, {
      anonymousMap: {
        badkey: { id: 1 }
      }
    })

    try {
      await instance.validate()
    } catch (error) {
      console.warn(error)
      return assert.equal(error.validationErrors.length, 1)
    }

    throw new Error('Validation did not fail')
  })
})
