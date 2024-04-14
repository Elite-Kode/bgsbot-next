import { SlashedCommand } from '../../interfaces/Command'
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  Message,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder
} from 'discord.js'
import { Responses } from '../responseDict'
import axios from 'axios'
import { TickType } from '../../interfaces/typings'
import { Access, AccessLevel } from '../access'
import { GuildModel, readGuild } from '../../db/guild'

export class Tick implements SlashedCommand {
  name = 'tick'
  description = 'Tick information'
  slash: SlashCommandSubcommandsOnlyBuilder

  constructor() {
    this.slash = new SlashCommandBuilder()
      .setName(this.name)
      .setDescription(this.description)
      .addSubcommand(subCommand =>
        subCommand
          .setName('get')
          .setDescription('Get the latest tick')
          .addBooleanOption(option => option.setName('hide').setDescription('Respond only to you?').setRequired(false))
      )
      .addSubcommand(subCommand =>
        subCommand
          .setName('announce')
          .setDescription('Enable/Disable automatic tick announcement')
          .addBooleanOption(option =>
            option.setName('enable').setDescription('Enable announcement?').setRequired(false)
          )
      )
  }

  async execInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
    const subCommand = interaction.options.getSubcommand()

    if (subCommand === 'get') {
      await interaction.reply({
        embeds: [await this.getTick(interaction)],
        ephemeral: interaction.options.getBoolean('hide') ?? false
      })
    } else if (subCommand === 'announce') {
      await interaction.reply({
        content: await this.setAnnounce(interaction),
        ephemeral: true
      })
    }
  }

  async execMessage(message: Message, commandArguments: string): Promise<void> {
    message.channel.send(Responses.getResponse(Responses.USESLASH))
  }

  // Method is deprecated
  help(): [string, string, string, string[]] {
    return ['', '', '', []]
  }

  async getTick(interaction: ChatInputCommandInteraction): Promise<EmbedBuilder> {
    if (!(await Access.has(interaction.user, interaction.guild, AccessLevel.ACCESS))) {
      return new EmbedBuilder()
        .setTitle('Tick')
        .setColor([255, 0, 255])
        .addFields({ name: 'Last Tick', value: Responses.getResponse(Responses.INSUFFICIENTPERMS) })
    }

    const url = 'https://elitebgs.app/api/ebgs/v5/ticks'

    const response = await axios.get(url)
    if (response.status === 200) {
      const body: TickType = response.data
      if (body.length === 0) {
        return new EmbedBuilder()
          .setTitle('Tick')
          .setColor([255, 0, 255])
          .addFields({ name: 'Last Tick', value: Responses.getResponse(Responses.FAIL) })
      } else {
        const lastTick = new Date(body[0].time)
        const formatted = Intl.DateTimeFormat('en', {
          hour: '2-digit',
          minute: '2-digit',
          day: 'numeric',
          month: 'short',
          weekday: 'short'
        }).format(lastTick)

        return new EmbedBuilder()
          .setTitle('Tick')
          .setColor([255, 0, 255])
          .addFields({ name: 'Last Tick', value: formatted })
          .setTimestamp(lastTick)
      }
    } else {
      console.error('Tick retrieval failed: {}', response.statusText)
      return new EmbedBuilder()
        .setTitle('Tick')
        .setColor([255, 0, 255])
        .addFields({ name: 'Last Tick', value: Responses.getResponse(Responses.FAIL) })
    }
  }

  async setAnnounce(interaction: ChatInputCommandInteraction): Promise<string> {
    if (!(await Access.has(interaction.user, interaction.guild, AccessLevel.ADMIN))) {
      return Responses.getResponse(Responses.INSUFFICIENTPERMS)
    }

    const guild = await readGuild(interaction.guild)
    const enable = interaction.options.getBoolean('enable')

    if (!enable) {
      return guild.announce_tick ? 'Tick announcing is **Enabled**' : 'Tick announcing is **Disabled**'
    } else {
      if (
        !(await GuildModel.findOneAndUpdate(
          { guild_id: guild.guild_id },
          { updated_at: new Date(), announce_tick: enable }
        ).exec())
      ) {
        return Responses.getResponse(Responses.FAIL)
      }
    }

    return Responses.getResponse(Responses.SUCCESS)
  }
}
