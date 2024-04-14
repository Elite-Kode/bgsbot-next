import { SlashedCommand } from '../../interfaces/Command'
import {
  ChatInputCommandInteraction, EmbedBuilder,
  Message,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder
} from 'discord.js'
import { Responses } from '../responseDict'
import { Access, AccessLevel } from '../access'
import { GuildModel, readGuild } from '../../db/guild'

export class Guild implements SlashedCommand {
  name = 'guild'
  description = 'Guild settings'
  slash: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder

  constructor() {
    this.slash = new SlashCommandBuilder()
      .setName(this.name)
      .setDescription(this.description)
      .addSubcommandGroup(subCommandGroup =>
        subCommandGroup
          .setName('role')
          .setDescription('Role settings')
          .addSubcommand(subCommand =>
            subCommand
              .setName('add')
              .setDescription('Register a role with the bot')
              .addStringOption(option =>
                option
                  .setName('type')
                  .setDescription('Which type of role is being added?')
                  .setRequired(true)
                  .addChoices(
                    { name: 'Forbidden', value: 'forbidden' },
                    { name: 'Access', value: 'access' },
                    { name: 'Admin', value: 'admin' }
                  )
              )
              .addRoleOption(option => option.setName('role').setDescription('The role to add').setRequired(true))
          )
          .addSubcommand(subCommand =>
            subCommand
              .setName('list')
              .setDescription('List the roles registered with the bot')
              .addStringOption(option =>
                option
                  .setName('type')
                  .setDescription('Which type of role is being added?')
                  .setRequired(false)
                  .addChoices(
                    { name: 'Forbidden', value: 'forbidden' },
                    { name: 'Access', value: 'access' },
                    { name: 'Admin', value: 'admin' }
                  )
              )
          )
      )
  }

  async execInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!(await Access.has(interaction.user, interaction.guild, AccessLevel.ADMIN))) {
      await interaction.reply({ content: Responses.getResponse(Responses.INSUFFICIENTPERMS), ephemeral: true })
      return
    }

    if (interaction.options.getSubcommandGroup() === 'role') {
      const subcommand = interaction.options.getSubcommand()
      if (subcommand === 'add') {
        await interaction.reply({ content: await this.addRole(interaction), ephemeral: true })
      } else if (subcommand === 'list') {
        await interaction.reply({ embeds: [await this.listRoles(interaction)], ephemeral: true })
      }
    }
  }

  async execMessage(message: Message, commandArguments: string): Promise<void> {
    message.channel.send(Responses.getResponse(Responses.USESLASH))
  }

  // Method is deprecated
  help(): [string, string, string, string[]] {
    return ['', '', '', []]
  }

  async addRole(interaction: ChatInputCommandInteraction): Promise<string> {
    const kind = interaction.options.getString('type')
    const role = interaction.options.getRole('role')
    const roleId = role.id

    const guild = await readGuild(interaction.guild)

    if (kind === 'forbidden') {
      if (guild.forbidden_roles_id.includes(roleId)) {
        return Responses.getResponse(Responses.ALREADYADDED)
      }

      await GuildModel.findOneAndUpdate(
        { guild_id: guild.guild_id },
        { updated_at: new Date(), $addToSet: { forbidden_roles_id: roleId } }
      ).exec()
    } else if (kind === 'access') {
      if (guild.access_roles_id.includes(roleId)) {
        return Responses.getResponse(Responses.ALREADYADDED)
      }

      await GuildModel.findOneAndUpdate(
        { guild_id: guild.guild_id },
        { updated_at: new Date(), $addToSet: { access_roles_id: roleId } }
      ).exec()
    } else if (kind === 'admin') {
      if (guild.admin_roles_id.includes(roleId)) {
        return Responses.getResponse(Responses.ALREADYADDED)
      }

      await GuildModel.findOneAndUpdate(
        { guild_id: guild.guild_id },
        { updated_at: new Date(), $addToSet: { admin_roles_id: roleId } }
      ).exec()
    }

    return Responses.getResponse(Responses.SUCCESS)
  }

  async listRoles(interaction: ChatInputCommandInteraction): Promise<EmbedBuilder> {
    const kind = interaction.options.getString('type')
    const guild = await readGuild(interaction.guild)

    let embed = new EmbedBuilder().setTitle('Roles')
    const fields = []

    if ((kind === 'admin' || !kind) && guild.admin_roles_id.length > 0) {
      fields.push({ name: 'Administrative roles', value: guild.admin_roles_id.map(v => `<@&${v}>`).join('\n') })
    } else if ((kind === 'access' || !kind) && guild.access_roles_id.length > 0) {
      fields.push({ name: 'Access roles', value: guild.access_roles_id.map(v => `<@&${v}>`).join('\n') })
    } else if ((kind === 'forbidden' || !kind) && guild.forbidden_roles_id.length > 0) {
      fields.push({ name: 'Forbidden roles', value: guild.forbidden_roles_id.map(v => `<@&${v}>`).join('\n') })
    }

    if (fields.length <= 0) {
      fields.push({ name: 'None registered', value: `None registered of kind ${kind}` })
    }

    embed = embed.addFields(fields)

    return embed
  }
}
