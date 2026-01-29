// @dada78641/strim-obstools <https://github.com/dada78641/strim-obstools>
// © MIT license

import {OBS_SOURCE_AUDIO} from './const.ts'
import type {Input} from '../../obs/types.ts'

/**
 * Returns whether an input supports audio.
 */
export function inputSupportsAudio(input: Input) {
  return input.inputKindCaps & OBS_SOURCE_AUDIO
}
