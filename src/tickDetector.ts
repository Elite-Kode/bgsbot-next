import { Socket } from 'socket.io'
import io from 'socket.io-client'
import { env } from 'node:process'
import { DateTime } from 'luxon'
import { ChannelType, Client, EmbedBuilder, GuildBasedChannel, PermissionsBitField } from 'discord.js'
import { GuildModel } from './db/guild'
import { Responses } from './discord/responseDict'

export class TickDetector {
  private readonly url: string
  private readonly client: Client
  private socket: Socket

  public constructor(client: Client) {
    this.url = env.TICK_DETECTOR_URL
    this.client = client
  }

  public async connectSocket() {
    this.listenToEvents()
    this.listenToTick()
    this.socket = io(this.url)
  }

  private listenToEvents(): void {
    this.socket.on('connect', () => {
      console.log('Connected to Tick Detector')
    })

    this.socket.on('connect_error', error => {
      console.log('Connection Error', error)
    })
  }

  private listenToTick(): void {
    this.socket.on('tick', async data => {
      const tickTime = new Date(data)
      const guilds = await GuildModel.find({
        announce_tick: true
      }).lean()
      for (const guild of guilds) {
        try {
          if (guild.announce_tick && guild.bgs_channel_id && guild.bgs_channel_id.length > 0) {
            const bgsChannel: GuildBasedChannel = this.client.guilds.cache
              .get(guild.guild_id)
              .channels.cache.get(guild.bgs_channel_id)
            if (bgsChannel && bgsChannel.type === ChannelType.GuildText) {
              const flags = PermissionsBitField.Flags
              if (bgsChannel.guild.members.me.permissionsIn(bgsChannel).has(flags.EmbedLinks)) {
                const lastTickFormattedTime = DateTime(tickTime).utc().format('HH:mm')
                const lastTickFormattedDate = DateTime(tickTime).utc().format('Do MMM')

                const embed = new EmbedBuilder()
                  .setTitle('Tick Detected')
                  .setColor([255, 0, 255])
                  .setTimestamp(new Date(tickTime))
                  .addFields([
                    { name: 'Latest Tick At', value: lastTickFormattedTime + ' UTC - ' + lastTickFormattedDate }
                  ])

                bgsChannel.send({ embeds: [embed] })
              } else {
                try {
                  bgsChannel.send(Responses.getResponse(Responses.EMBEDPERMISSION))
                } catch (err) {
                  console.error(err)
                }
              }
            }
          }
        } catch (err) {
          console.error(err)
        }
      }
    })
  }
}
