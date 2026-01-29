// @dada78641/strim-obstools <https://github.com/dada78641/strim-obstools>
// © MIT license

import {ObsToolsBase} from './base.ts'
import {AudioMixin} from '../mixins/audio/index.ts'
import {GamesMixin} from '../mixins/games/index.ts'
import {UtilMixin} from '../mixins/util/index.ts'
import {TriggersMixin} from '../mixins/triggers/index.ts'
import {DebugMixin} from '../mixins/debug/index.ts'

export * from './base.ts'
export class ObsTools extends
  UtilMixin(
  AudioMixin(
  TriggersMixin(
  GamesMixin(
  DebugMixin(
    ObsToolsBase
  ))))) {}
