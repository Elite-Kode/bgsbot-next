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
import { EBGSFactionsDetailed, FieldRecordSchema } from '../../interfaces/typings'
import { FdevIds } from '../../fdevids'
import { StringHelpers } from '../../stringHelpers'
import { Tick } from './tick'
import { DateHelpers } from '../../dateHelpers'
import { readGuild } from '../../db/guild'
import { ReportHelpers } from '../../reportHelpers'
import { Pagination } from '../pagination'

export class FactionStatus implements SlashedCommand {
  description = "Get a faction's status"
  name = 'faction'
  slash: Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>

  constructor() {
    this.slash = new SlashCommandBuilder()
      .setName(this.name)
      .setDescription(this.description)
      .addStringOption(option =>
        option.setName('faction').setDescription('The faction to get information for').setRequired(true)
      )
  }

  // TODO: This is a mess. Refactor
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

    const name = interaction.options.getString('faction')
    const url = 'https://elitebgs.app/api/ebgs/v5/factions'
    const requestOptions: AxiosRequestConfig = {
      params: {
        name,
        systemDetails: true,
        count: 2
      }
    }

    await interaction.deferReply({ ephemeral: false })

    const response = await axios.get(url, requestOptions)
    if (response.status !== 200) {
      await interaction.editReply({ content: Responses.getResponse(Responses.FAIL) })
      return
    }

    const body: EBGSFactionsDetailed = response.data
    if (body.total === 0) {
      await interaction.editReply({ content: Responses.getResponse(Responses.IDNOTFOUND) })
      return
    }

    const fdevIds = await FdevIds.getIds()
    const faction = body.docs[0]
    const factionName = faction.name
    const government = StringHelpers.titlify(faction.government)
    const presence = faction.faction_presence
    const tick = await new Tick().getTickData()
    const tickDate = new Date(tick.time)

    let fieldRecords: FieldRecordSchema[] = []
    for (const system of presence) {
      const state = fdevIds.state[system.state].name
      const influence = system.influence
      const filtered = faction.history.filter(systemEach => {
        return systemEach.system_lower === system.system_name_lower
      })

      const influenceDifference = filtered.length === 2 ? influence - filtered[1].influence : 0
      const happiness = fdevIds.happiness[system.happiness].name
      const activeStates = system.active_states
      const pendingStates = system.pending_states
      const recoveringStates = system.recovering_states
      const influenceDifferenceText = StringHelpers.influenceDifferenceText(influenceDifference)
      const updateDate = new Date(system.updated_at)
      const suffix = StringHelpers.beforeAfterSuffix(tickDate, updateDate)

      let factionDetail = `Last Updated : ${DateHelpers.timeDifference(
        updateDate,
        new Date()
      )}, ${DateHelpers.timeSince(tickDate, updateDate)} ${suffix} last detected tick \n`
      factionDetail += `State : ${state}\n`
      factionDetail += `Happiness: ${happiness}\n`
      factionDetail += `Influence : ${(influence * 100).toFixed(1)}%${influenceDifferenceText}\n`

      factionDetail += ReportHelpers.generateStateStrings(activeStates, pendingStates, recoveringStates)

      fieldRecords.push({
        fieldTitle: system.system_name,
        fieldDescription: factionDetail,
        name: system.system_name,
        influence: system.influence
      })
    }

    const guild = await readGuild(interaction.guild)

    if (guild.sort && guild.sort_order && guild.sort_order !== 0) {
      fieldRecords = ReportHelpers.sortByGuildPreference(fieldRecords, guild.sort_order, guild.sort)
    }

    await Pagination.paginateAndRespond(interaction, fieldRecords, factionName, government)
  }

  async execMessage(message: Message, commandArguments: string): Promise<void> {
    message.channel.send(Responses.getResponse(Responses.USESLASH))
  }

  // Method is deprecated
  help(): [string, string, string, string[]] {
    return ['', '', '', []]
  }
}
