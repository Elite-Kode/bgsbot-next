import { SlashedCommand } from '../../interfaces/Command'
import {
  ChatInputCommandInteraction,
  Message,
  PermissionsBitField,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder
} from 'discord.js'
import { Responses } from '../responseDict'
import { Tick } from './tick'
import { readGuild } from '../../db/guild'
import { Access, AccessLevel } from '../access'
import { FdevIds } from '../../fdevids'

export class Report implements SlashedCommand {
  name = 'report'
  description = 'Report settings'
  slash: SlashCommandSubcommandsOnlyBuilder

  constructor() {
    this.slash = new SlashCommandBuilder()
      .setName(this.name)
      .setDescription(this.description)
      .addSubcommand(subcommand => subcommand.setName('generate').setDescription('Generate a BGS report'))
  }

  async execInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand()

    if (subcommand === 'generate') {
      await this.generate(interaction)
    }
  }

  async execMessage(message: Message, commandArguments: string): Promise<void> {
    message.channel.send(Responses.getResponse(Responses.USESLASH))
  }

  // Method is deprecated
  help(): [string, string, string, string[]] {
    return ['', '', '', []]
  }

  async generate(interaction: ChatInputCommandInteraction): Promise<void> {
    
  }

  async generateEmbed(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!(await Access.has(interaction.user, interaction.guild, AccessLevel.ACCESS))) {
      await interaction.reply({ content: Responses.getResponse(Responses.INSUFFICIENTPERMS), ephemeral: true })
      return
    }

    if (
      !interaction.guild.members.me.permissionsIn(interaction.channelId).has([PermissionsBitField.Flags.EmbedLinks])
    ) {
      await interaction.reply({ content: Responses.getResponse(Responses.EMBEDPERMISSION), ephemeral: true })
      return
    }

    const tick = await new Tick().getTickData()
    const guild = await readGuild(interaction.guild)
    const fdevIds = await FdevIds.getIds()
  }
}