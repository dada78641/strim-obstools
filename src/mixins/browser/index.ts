// @dada78641/strim-obstools <https://github.com/dada78641/strim-obstools>
// © MIT license

import type {Constructor} from '../../util/mixins.ts'
import type {HasObs} from '../../obstools/base.ts'
import type {Source} from '../../obs/types.ts'
import {UtilMixin} from '../util/index.ts'

export function BrowserMixin<TBase extends Constructor<HasObs>>(Base: TBase) {
  return class extends UtilMixin(Base) {
    /**
     * Returns all Discord Streamkit sources.
     */
    public async getStreamkitSources(): Promise<Source[]> {
      const browserSources = (await this.getCollectionBrowserSources(true))
        .filter(source => source.inputSettings?.url.includes('://streamkit.discord.com'))
      return browserSources
    }

    /**
     * Returns the currently active Streamkit server and channel.
     * 
     * Note that this only returns data for the first browser source.
     * It's assumed that they are all the same, which is what they should be.
     */
    public async getStreamkitServerChannel(): Promise<[string, string]> {
      const streamkitSources = await this.getStreamkitSources()
      for (const source of streamkitSources) {
        const url = source.inputSettings?.url as string
        const data = url.match(/overlay\/voice\/([0-9]+)\/([0-9]+)/)
        if (!data) {
          throw new Error(`Not a Streamkit URL: ${url}`)
        }
        const server = data[1]
        const channel = data[2]
        return [server, channel]
      }
      // If none is found, this is actually still a valid state.
      // We just return two empty strings instead.
      return ['', '']
    }

    /**
     * Switches all Streamkit sources over to a new server and channel value.
     */
    public async setStreamkitServerChannel(newServer: string, newChannel: string) {
      const streamkitSources = await this.getStreamkitSources()
      const urlReplacements: [Source, string][] = []
      for (const source of streamkitSources) {
        const url = source.inputSettings?.url as string
        const data = url.match(/overlay\/voice\/([0-9]+)\/([0-9]+)/)
        if (!data) {
          throw new Error(`Not a Streamkit URL: ${url}`)
        }
        const server = data[1]
        const channel = data[2]
        const newURL = url.replaceAll(server, newServer).replaceAll(channel, newChannel)
        urlReplacements.push([source, newURL])
      }
      return this.obs.callBatch(urlReplacements.map(([source, newURL]) => ({
        requestType: 'SetInputSettings',
        requestData: {
          inputName: source.sourceName,
          inputSettings: {
            url: newURL
          },
          overlay: true
        }
      })))
    }
  }
}
