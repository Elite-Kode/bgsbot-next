import { SlashedCommand } from '../../interfaces/Command'
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
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
          .addSubcommand(subCommand =>
            subCommand
              .setName('remove')
              .setDescription('Remove a registered role from the bot')
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
              .addRoleOption(option => option.setName('role').setDescription('The role to remove').setRequired(true))
          )
      )
      .addSubcommand(subCommand =>
        subCommand
          .setName('theme')
          .setDescription('Change the theme used in graphs')
          .addStringOption(option =>
            option
              .setName('theme')
              .setDescription('The theme used')
              .setRequired(true)
              .addChoices({ name: 'Dark', value: 'dark' }, { name: 'Light', value: 'light' })
          )
      )
  }

  async execInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!(await Access.has(interaction.user, interaction.guild, AccessLevel.ADMIN))) {
      await interaction.reply({ content: Responses.getResponse(Responses.INSUFFICIENTPERMS), ephemeral: true })
      return
    }

    const subCommand = interaction.options.getSubcommand()
    const subCommandGroup = interaction.options.getSubcommandGroup()

    if (subCommandGroup === 'role') {
      if (subCommand === 'add') {
        await interaction.reply({ content: await this.addRole(interaction), ephemeral: true })
      } else if (subCommand === 'list') {
        await interaction.reply({ embeds: [await this.listRoles(interaction)], ephemeral: true })
      } else if (subCommand === 'remove') {
        await interaction.reply({ content: await this.removeRole(interaction), ephemeral: true })
      }
    } else if (subCommand === 'theme') {
      await interaction.reply({ content: await this.changeTheme(interaction), ephemeral: true })
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
    }

    if ((kind === 'access' || !kind) && guild.access_roles_id.length > 0) {
      fields.push({ name: 'Access roles', value: guild.access_roles_id.map(v => `<@&${v}>`).join('\n') })
    }

    if ((kind === 'forbidden' || !kind) && guild.forbidden_roles_id.length > 0) {
      fields.push({ name: 'Forbidden roles', value: guild.forbidden_roles_id.map(v => `<@&${v}>`).join('\n') })
    }

    if (fields.length <= 0) {
      fields.push({ name: 'None registered', value: `None registered of kind ${kind}` })
    }

    console.log(fields)
    embed = embed.addFields(fields)

    return embed
  }

  async removeRole(interaction: ChatInputCommandInteraction): Promise<string> {
    const kind = interaction.options.getString('type')
    const role = interaction.options.getRole('role')
    const roleId = role.id
    const guild = await readGuild(interaction.guild)

    if (kind === 'admin') {
      if (!guild.admin_roles_id.includes(roleId)) return Responses.getResponse(Responses.IDNOTFOUND)

      await GuildModel.findOneAndUpdate(
        { guild_id: guild.guild_id },
        { updated_at: new Date(), $pullAll: { admin_roles_id: [roleId] } }
      ).exec()
    }

    return Responses.getResponse(Responses.SUCCESS)
  }

  async changeTheme(interaction: ChatInputCommandInteraction): Promise<string> {
    const guild = await readGuild(interaction.guild)
    const theme = interaction.options.getString('theme')

    if (!(await GuildModel.findOneAndUpdate({ guild_id: guild.guild_id }, { updated_at: new Date(), theme }).exec())) {
      return Responses.getResponse(Responses.FAIL)
    }

    return Responses.getResponse(Responses.SUCCESS)
  }
}
