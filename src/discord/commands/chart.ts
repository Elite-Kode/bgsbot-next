import { SlashedCommand } from '../../interfaces/Command'
import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  Message,
  PermissionsBitField,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder
} from 'discord.js'
import { Responses } from '../responseDict'
import { Access, AccessLevel } from '../access'
import { readGuild } from '../../db/guild'
import axios, { AxiosRequestConfig } from 'axios'

export class Chart implements SlashedCommand {
  name = 'chart'
  description = 'Generate a chart'
  slash: SlashCommandSubcommandsOnlyBuilder

  constructor() {
    this.slash = new SlashCommandBuilder()
      .setName(this.name)
      .setDescription(this.description)
      .addSubcommand(subCommand =>
        subCommand
          .setName('tick')
          .setDescription('Show the ticks on a chart')
          .addBooleanOption(option =>
            option.setName('hide').setDescription('Hide the response for others?').setRequired(false)
          )
      )
      .addSubcommand(subCommand =>
        subCommand
          .setName('systems')
          .setDescription('Generate a chart for a system')
          .addStringOption(option =>
            option
              .setName('filter')
              .setDescription('Which metric to show on the graph')
              .setRequired(true)
              .setChoices({ name: 'Influence', value: 'influence' })
          )
          .addStringOption(option =>
            option.setName('target').setDescription('Which system to generate the graph for').setRequired(true)
          )
          .addBooleanOption(option =>
            option.setName('hide').setDescription('Hide the response for others?').setRequired(false)
          )
      )
      .addSubcommand(subCommand =>
        subCommand
          .setName('factions')
          .setDescription('Generate a chart for a faction')
          .addStringOption(option =>
            option
              .setName('filter')
              .setDescription('Which states to show')
              .setRequired(true)
              .setChoices(
                { name: 'Active', value: 'active' },
                { name: 'Pending', value: 'pending' },
                { name: 'Recovering', value: 'recovering' }
              )
          )
          .addStringOption(option =>
            option.setName('target').setDescription('Which faction to generate the graph for').setRequired(true)
          )
          .addBooleanOption(option =>
            option.setName('hide').setDescription('Hide the response for others?').setRequired(false)
          )
      )
  }

  async execInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!(await Access.has(interaction.user, interaction.guild, AccessLevel.ACCESS))) {
      await interaction.reply({ content: Responses.getResponse(Responses.INSUFFICIENTPERMS), ephemeral: true })
      return
    }

    const kind = interaction.options.getSubcommand()
    const filter = interaction.options.getString('filter')
    const name = interaction.options.getString('target')
    const hide = interaction.options.getBoolean('hide') ?? false

    const urlBase = 'https://elitebgs.app/api/chartgenerator'

    let url
    if (kind === 'tick') {
      url = `${urlBase}/${kind}`
    } else {
      url = `${urlBase}/${kind}/${filter}`
    }

    if (
      !interaction.guild.members.me
        .permissionsIn(interaction.channelId)
        .has([PermissionsBitField.Flags.EmbedLinks, PermissionsBitField.Flags.AttachFiles])
    ) {
      await interaction.reply({ content: Responses.getResponse(Responses.EMBEDPERMISSION), ephemeral: true })
      return
    }

    const guild = await readGuild(interaction.guild)
    const theme = guild.theme ?? 'light'
    const now = new Date().getTime()

    const requestOptions: AxiosRequestConfig = {
      params: {
        name,
        timeMin: now - 10 * 24 * 60 * 60 * 1000,
        timeMax: now,
        theme
      },
      responseType: 'arraybuffer'
    }

    await interaction.deferReply({ ephemeral: hide })

    const response = await axios.get(url, requestOptions)
    if (response.status === 200) {
      const attachment = new AttachmentBuilder(response.data)
      await interaction.editReply({ files: [attachment] })
      return
    } else {
      await interaction.editReply({ content: Responses.getResponse(Responses.FAIL) })
      return
    }
  }

  async execMessage(message: Message, commandArguments: string): Promise<void> {
    message.channel.send(Responses.getResponse(Responses.USESLASH))
  }

  // Method is deprecated
  help(): [string, string, string, string[]] {
    return ['', '', '', []]
  }
}
