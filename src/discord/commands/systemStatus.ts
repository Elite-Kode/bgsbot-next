import { SlashedCommand } from '../../interfaces/Command'
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  Message,
  PermissionsBitField,
  SlashCommandBuilder
} from 'discord.js'
import { Responses } from '../responseDict'
import { Access, AccessLevel } from '../access'
import axios, { AxiosRequestConfig } from 'axios'
import { Tick } from './tick'
import { EBGSSystemsDetailed, FieldRecordSchema } from '../../interfaces/typings'
import { FdevIds } from '../../fdevids'
import { DateHelpers } from '../../dateHelpers'
import { readGuild } from '../../db/guild'
import { StringHelpers } from '../../stringHelpers'
import { ReportHelpers } from '../../reportHelpers'
import { Pagination } from '../pagination'

export class SystemStatus implements SlashedCommand {
  name = 'system'
  description = "Get a system's status"
  slash: Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>

  constructor() {
    this.slash = new SlashCommandBuilder()
      .setName(this.name)
      .setDescription(this.description)
      .addStringOption(option =>
        option.setName('system').setDescription('The system to get information for').setRequired(true)
      )
  }

  // TODO: This is a mess. Refactor.
  async execInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
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

    const systemName = interaction.options.getString('system')
    const url = 'https://elitebgs.app/api/ebgs/v5/systems'
    const requestOptions: AxiosRequestConfig = {
      params: {
        name: systemName,
        factionDetails: true,
        factionHistory: true,
        count: 2
      }
    }

    await interaction.deferReply({ ephemeral: false })

    const response = await axios.get(url, requestOptions)
    if (response.status !== 200) {
      await interaction.editReply({ content: Responses.getResponse(Responses.FAIL) })
      return
    }

    const body: EBGSSystemsDetailed = response.data
    if (body.total === 0) {
      await interaction.editReply({ content: Responses.getResponse(Responses.IDNOTFOUND) })
      return
    }

    const fdevIds = await FdevIds.getIds()
    const system = body.docs[0]
    const systemState = fdevIds.state[system.state].name ?? 'None'
    const controlling = system.controlling_minor_faction_id
    const minorFactions = system.factions
    const tick = await new Tick().getTickData()
    const tickDate = new Date(tick.time)
    const updateDate = new Date(system.updated_at)
    const suffix = StringHelpers.beforeAfterSuffix(tickDate, updateDate)

    let fieldRecords: FieldRecordSchema[] = []
    for (const faction of minorFactions) {
      const state = fdevIds.state[faction.faction_details.faction_presence.state].name
      const influence = faction.faction_details.faction_presence.influence
      const filtered = system.faction_history.filter(factionEach => {
        return factionEach.faction_name_lower === faction.name_lower
      })

      const influenceDifference = filtered.length === 2 ? influence - filtered[1].influence : 0
      const happiness = fdevIds.happiness[faction.faction_details.faction_presence.happiness].name
      const activeStates = faction.faction_details.faction_presence.active_states
      const pendingStates = faction.faction_details.faction_presence.pending_states
      const recoveringStates = faction.faction_details.faction_presence.recovering_states
      const influenceDifferenceText = StringHelpers.influenceDifferenceText(influenceDifference)

      let factionDetail = `Last Updated : ${DateHelpers.timeDifference(
        updateDate,
        new Date()
      )}, ${DateHelpers.timeSince(tickDate, updateDate)} ${suffix} last detected tick \n`
      factionDetail += `State : ${state}\n`
      factionDetail += `Happiness: ${happiness}\n`
      factionDetail += `Influence : ${(influence * 100).toFixed(1)}%${influenceDifferenceText}\n`

      factionDetail += ReportHelpers.generateStateStrings(activeStates, pendingStates, recoveringStates)

      let fieldTitle = faction.name
      if (faction.faction_id === controlling) {
        fieldTitle += '👑'
      }

      fieldRecords.push({
        fieldTitle: fieldTitle,
        fieldDescription: factionDetail,
        name: faction.name,
        influence: faction.faction_details.faction_presence.influence
      })
    }

    const guild = await readGuild(interaction.guild)

    if (guild.sort && guild.sort_order && guild.sort_order !== 0) {
      fieldRecords = ReportHelpers.sortByGuildPreference(fieldRecords, guild.sort_order, guild.sort)
    }

    const embed = new EmbedBuilder()
      .setTitle('System Status')
      .setColor([255, 0, 255])
      .addFields({ name: systemName, value: systemState })
      .setTimestamp(new Date())

    for (const field of fieldRecords) {
      embed.addFields({ name: field.fieldTitle, value: field.fieldDescription })
    }

    await Pagination.paginateAndRespond(interaction, fieldRecords, systemName, systemState)
  }

  async execMessage(message: Message, commandArguments: string): Promise<void> {
    message.channel.send(Responses.getResponse(Responses.USESLASH))
  }

  // Method is deprecated
  help(): [string, string, string, string[]] {
    return ['', '', '', []]
  }
}
