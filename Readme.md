mage-validator
==============

Validation system for MAGE topics and user command input types (TypeScript).

Installation
-------------

```shell
npm install --save mage-validator class-validator class-transformer reflect-metadata
```

You need to install two peer dependencies alongside `mage-validator`:

  1. `class-validator` so that you may add validation decorators to your data class
  2. `class-transformer` to control how the received data will be deserialised
  3. `relfect-metadata` will be needed by the two modules above to extract type information


You will also need to make sure that the following configuration is set in your
`tsconfig.json`:

```json
{
  "experimentalDecorators": true,
  "emitDecoratorMetadata": true
}
```

Usage
-----

mage-validator exports all functions exposed by class-validator and
class-transformer for convenience. A few changes and additions have
however been made for convenience.

### @Type decorator

```typescript
// Both are equivalent
@Type(Hello)
@Type(() => Hello)
```

The `@Type` decorator has been customized to accept either a type 
or a function (instead of only a function).

### @MapOf decorator

```typescript
function validateFunc(key: string, value: Child) {
  throw new Error('never valid')
}

class Child { @IsPositive() public id: number }

@MapOf(Child)
class DynamicMap { [key: string]: Child }

class TestTopic extends ValidatedTopic {
  // [...]

  // Use a Map class
  @Type(DynamicMap) public map: DynamicMap

  // Use an anonymous object as a map
  @MapOf(Child) public anonymousMap: { [key: string]: Child }

  @MapOf(Child, validateFunc) public anotherMap: { [key: string]: Child }
}
```

`mage-validator` also provides an additional `@MapOf` decorator for dealing with
key-value map objects; using this type will both ensure nested maps entries
will be typed and that each entries will be validated (so `@ValidateNested` 
is not required).

### (Optional) Project structure

In normal MAGE projects, you need to put all your topics configuration under
`./lib/archivist/index.ts`. However, this quickly becomes hard to manage as
the number of topics grows.

Instead, we recommend using the following file structure:

```plaintext
lib/
  archivist/
    index.ts
  modules/
    modulename/
      topics/
        Players.ts
      types/
        PlayerConfig.ts
        SomethingElse.ts
      usercommands/
        addGems.ts
        commandTwo.ts
      index.ts
  index.ts
```

In other words, we recommend to separate MAGE topics and attach them to their
related modules under the `topics` folder; we also recommend to put other 
types (example: user command custom parameter type) under a `types` folder.

To make it easier for you to set this up, `mage-validator` comes with a method you
can simply drop into `./lib/archivist/index.ts`; it will scan each one of your
modules and attempt to load all topics defined in them.

> `./lib/archivist/index.ts`

```typescript
import { loadTopicsFromModules } from 'mage-validator'

loadTopicsFromModules(exports)
```

### User command parameters and return data validation

Validation works by encapsulating messages into types:

> `./lib/modules/modulename/types/PlayerData.ts`

```typescript
import { IsInt, Max } from 'mage-validator';

export default class {
    @IsInt()
    @Max(5)
    public count: gems = 1 // Default value
}
```

Which then can be used as user commands types:

> `./lib/modules/modulename/usercommands/addGems.ts`

```typescript
import * as mage from 'mage'
import { Type, IsInt, Max, ValidateNested, Acl } from 'mage-validator'
import PlayerData from '../types/PlayerData'

export default class {
    @IsInt()
    @Min(1)
    public gemRegisterBonus: number

    @ValidateNested()
    @Type(() => PlayerData)
    public data: PlayerData

    @Acl('*')
    public static async execute(state: mage.core.IState, data: PlayerData, gemRegisterBonus: number) {
        data.gems += gemRegisterBonus
        return data
    }
}
```

In this case, both `data` and `gemRegisterBonus` will be validated prior to execution, and
`data` will be validated once again once it is returned.

### Topics

#### Topic definition

Topics work the same way as types, except that they contain the topic 
configuration as static parameters:

> `./lib/modules/modulename/topics/Player.ts`

```typescript
import { ValidatedTopic, ValidateNested, IsUUID, IsAlpha } from 'mage-validator';
import { Type } from 'class-transform';
import PlayerData from '../topics/PlayerData'

class Index {
  @isUUID(5)
  playerId: string
}

export default class {
    // Index configuration
    public static readonly index = ['playerId']
    public static readonly indexType = Index

    // Vaults configuration (optional)
    public static readonly vaults = {}
    
    // Attribute instances
    @IsAlpha()
    public name: string

    @ValidateNested()
    @Type(() => PlayerData)
    public data: PlayerData
}
```

If you wish to use [tome](https://github.com/Wizcorp/node-tomes) instead, you can
you can extend the `ValidatedTomeTopic` class instead. Unlike normal `tomes`, you will
simply access and set object values directly (instead of using `assign`, `set`, `valueOf` 
and so on).

#### Loading topics

> `./lib/modules/modulename/usercommands/getPlayer.ts`

```typescript
import * as mage from 'mage'
import { Acl } from 'mage-validator'
import Player from '../topics/Player'

export default class {
    @IsUUID(5)
    public id: string

    @Acl('*')
    public static async execute(state: mage.core.IState, id: string) {
        return await Player.get(state, { playerId: id })
    }
}
```

#### Storing topics

Topic instances also work as state wrappers:

> `./lib/modules/modulename/usercommands/createPlayer.ts`

```typescript
import * as mage from 'mage'
import { Acl } from 'mage-validator'
import PlayerData from '../types/PlayerData'
import Player from '../topics/Player'

export default class {
    @Acl('*')
    public static async execute(state: mage.core.IState, name: string) {
        const player: Player = Player.create(state, { playerId: '123' })
        player.name = name
        player.data = new PlayerData()
        player.data.gems = 5

        return player.add() // Same a state.archivist.add()
    }
}
```

In this particular case, you could even simply put the player
topic directly as you user command parameter; all you will 
then need to do is to set the index at some point before you attempt
to record any operations:

#### Migrating topics

> `./lib/modules/modulename/topics/Player.ts`

```typescript
import { ValidatedTopic, ValidateNested, IsUUID, IsAlpha } from 'mage-validator';
import { Type } from 'class-transform';
import PlayerData from '../topics/PlayerData'

class Index {
  @isUUID(5)
  playerId: string
}

export default class {
    // Index configuration
    public static readonly index = ['playerId']
    public static readonly indexType = Index

    // Vaults configuration (optional)
    public static readonly vaults = {}
    
    // Attribute instances
    @IsAlpha()
    public name: string

    public age: number

    @ValidateNested()
    @Type(() => PlayerData)
    public data: PlayerData

    @Migrate(1)
    public setDefaultName() {
      if (!this.name) {
        this.name = 'DefaultName' + Math.floor(Math.random() * 1000)
      }
    }

    @Migrate(2)
    public setDefaultAge() {
      if (!this.age) {
        this.age = 0
      }
    }
}
```

All `ValdiatedTopic` have a `_version`, attribute used for data versioning. The default value is 0.  

You can define methods to be used as migration steps. Use the `Migration`
decorator to define the version this step will upgrade the data to. 
Only migration steps with a higher step value than the current data will
be executed. 

Migrations will **not** be executed on newly created topic instances.

#### Topics as user command parameters

> `./lib/modules/modulename/usercommands/createPlayer.ts`

```typescript
import * as mage from 'mage'
import { ValidateNested, Type, Acl } from 'mage-validator'
import Player from '../topics/Player'

export default class {
    @ValidateNested()
    @Type(() => Player)
    public player: Player

    @Acl('*')
    public static async execute(state: mage.core.IState, player: Player) {
        player.add()
        return player
    }
}
```

License
-------

MIT.
