// @dada78641/strim-obstools <https://github.com/dada78641/strim-obstools>
// © MIT license

import {uniqBy, sortBy} from 'lodash-es'
import type {Constructor} from '../../util/mixins.ts'
import type {HasObs} from '../../obstools/base.ts'
import type {Input, AudioInput, InputAudioMonitorType, InputVolume, AudioInputMetadata} from '../../obs/types.ts'
import {UtilMixin} from '../util/index.ts'
import {inputSupportsAudio} from './util.ts'

export function AudioMixin<TBase extends Constructor<HasObs>>(Base: TBase) {
  return class extends UtilMixin(Base) {
    /**
     * Returns all audio-supporting inputs, with input settings and input kind included.
     * 
     * Note that browser sources with "reroute_audio" not set to "true" do not emit audio, but are included in the result.
     */
    public async getCollectionAudioInputs(): Promise<AudioInput[]> {
      const inputs = await this.obs.call('GetInputList') as unknown as {inputs: Input[]}
      const audioInputs: Input[] = []

      for (const input of inputs.inputs) {
        if (!inputSupportsAudio(input)) {
          continue
        }
        audioInputs.push(input)
      }
      const audioInputUuids = audioInputs.map(audioInput => audioInput.inputUuid)
      const inputSettings = (
        await this.obs.callBatch(audioInputUuids.map(inputUuid => ({
          requestType: 'GetInputSettings',
          requestData: {inputUuid}
        }))))
        .map((item, n) => ({inputName: audioInputs[n].inputName, inputUuid: audioInputUuids[n], ...item.responseData}))
      
      return inputSettings as AudioInput[]
    }

    /**
     * Returns all audio inputs for a given scene.
     * 
     * This recurses into nested scenes.
     */
    public async _getSceneAudioInputs(sceneUuid: string, availableAudioInputs: Map<string, AudioInput>): Promise<AudioInput[]> {
      const sceneItems = await this.getSceneWithSceneItems(sceneUuid)
      const sceneAudioInputs = []
      
      for (const sceneItem of sceneItems) {
        if (sceneItem.sourceType === 'OBS_SOURCE_TYPE_SCENE') {
          const nestedSceneAudioInputs = await this._getSceneAudioInputs(sceneItem.sourceUuid, availableAudioInputs)
          sceneAudioInputs.push(...nestedSceneAudioInputs)
          continue
        }
        const sourceAudio = availableAudioInputs.get(sceneItem.sourceUuid)
        if (sourceAudio == null || (sourceAudio.inputKind === 'browser_source' && sourceAudio.inputSettings.reroute_audio !== true)) {
          continue
        }
        sceneAudioInputs.push(sourceAudio)
      }

      return sceneAudioInputs
    }

    /**
     * Returns additional audio data for a given set of audio inputs.
     */
    public async _getAudioInputsData(audioInputs: AudioInput[]): Promise<AudioInputMetadata[]> {
      const inputUuids = audioInputs.map(audioInput => audioInput.inputUuid)
      const volumes = (await this.obs.callBatch(inputUuids.map(inputUuid => ({requestType: 'GetInputVolume', requestData: {inputUuid}}))))
        .map(volumeResult => volumeResult.responseData) as InputVolume[]
      const monitorTypes = (await this.obs.callBatch(inputUuids.map(inputUuid => ({requestType: 'GetInputAudioMonitorType', requestData: {inputUuid}}))))
        .map(monitorTypeResult => monitorTypeResult.responseData) as InputAudioMonitorType[]
      return audioInputs.map((audioInput, n) => ({...audioInput, ...volumes[n], ...monitorTypes[n]})) as AudioInputMetadata[]
    }

    /**
     * Returns all audio inputs for a given scene.
     */
    public async getSceneAudioInputs(sceneUuid: string): Promise<AudioInputMetadata[]> {
      const audioInputs = await this.getCollectionAudioInputs()
      const audioInputMap = new Map(audioInputs.map(audioInput => [audioInput.inputUuid, audioInput]))
      const sceneAudioInputs = uniqBy(await this._getSceneAudioInputs(sceneUuid, audioInputMap), 'inputUuid')
      const sceneAudioInputsData = await this._getAudioInputsData(sceneAudioInputs)
      return sortBy(sceneAudioInputsData, 'inputName')
    }

    /**
     * Returns all audio inputs for the current scene.
     */
    public async getCurrentSceneAudioInputs(): Promise<AudioInputMetadata[]> {
      const scene = await this.obs.call('GetCurrentProgramScene')
      return this.getSceneAudioInputs(scene.sceneUuid)
    }
  }
}
