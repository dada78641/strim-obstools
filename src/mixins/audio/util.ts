// @dada78641/strim-obstools <https://github.com/dada78641/strim-obstools>
// © MIT license

import {OBS_SOURCE_AUDIO} from './const.ts'
import type {Input, AudioInputMetadata, SourceFilter} from '../../obs/types.ts'
import type {MixerItem} from './index.ts'
import {extractTags} from '../util/util.ts'

/**
 * Returns whether an input supports audio.
 */
export function inputSupportsAudio(input: Input) {
  return input.inputKindCaps & OBS_SOURCE_AUDIO
}

/**
 * Finds the audio mixer gain filter.
 */
export function findMixerGainFilter(filters: SourceFilter[]): SourceFilter | undefined {
  return filters.find(filter => filter.filterName.includes(`[[AudioMixerGain]]`))
}

/**
 * Matches a mixer item to an audio input item.
 */
export function matchMixerItem(audioInputs: AudioInputMetadata[], mixerItem: MixerItem): AudioInputMetadata | undefined {
  if (mixerItem.inputName != null) {
    return audioInputs.find(audioInput => audioInput.inputName === mixerItem.inputName)
  }
  if (mixerItem.specialInputName != null) {
    //
    return undefined
  }
  if (mixerItem.identifiers.length) {
    const audioInput = audioInputs.find(audioInput => {
      const tags = extractTags(audioInput.inputName)
      for (const identifier of mixerItem.identifiers) {
        const hasIdentifier = tags.find(tag => tag.key === identifier)
        if (!hasIdentifier) {
          return false
        }
      }
      return true
    })
    return audioInput
  }
  return undefined
}
