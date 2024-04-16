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
    const suffix = updateDate.getTime() > tickDate.getTime() ? 'after' : 'before'

    const fieldRecord: FieldRecordSchema[] = []
    for (const faction of minorFactions) {
      const state = fdevIds.state[faction.faction_details.faction_presence.state].name
      const influence = faction.faction_details.faction_presence.influence
      const filtered = system.faction_history.filter(factionEach => {
        return factionEach.faction_name_lower === faction.name_lower
      })
      let influenceDifference = 0
      if (filtered.length === 2) {
        influenceDifference = influence - filtered[1].influence
      }
      const happiness = fdevIds.happiness[faction.faction_details.faction_presence.happiness].name
      const activeStatesArray = faction.faction_details.faction_presence.active_states
      const pendingStatesArray = faction.faction_details.faction_presence.pending_states
      const recoveringStatesArray = faction.faction_details.faction_presence.recovering_states
      let influenceDifferenceText
      if (influenceDifference > 0) {
        influenceDifferenceText = `📈${(influenceDifference * 100).toFixed(1)}%`
      } else if (influenceDifference < 0) {
        influenceDifferenceText = `📉${(-influenceDifference * 100).toFixed(1)}%`
      } else {
        influenceDifferenceText = `🔷${(influenceDifference * 100).toFixed(1)}%`
      }
      let factionDetail = `Last Updated : ${DateHelpers.timeDifference(
        updateDate,
        new Date()
      )}, ${DateHelpers.timeSince(tickDate, updateDate)} ${suffix} last detected tick \n`
      factionDetail += `State : ${state}\n`
      factionDetail += `Happiness: ${happiness}\n`
      factionDetail += `Influence : ${(influence * 100).toFixed(1)}%${influenceDifferenceText}\n`
      let activeStates: string = ''
      if (activeStatesArray.length === 0) {
        activeStates = 'None'
      } else {
        activeStatesArray.forEach((activeState, index, factionActiveStates) => {
          activeStates = `${activeStates}${fdevIds.state[activeState.state].name}`
          if (index !== factionActiveStates.length - 1) {
            activeStates = `${activeStates}, `
          }
        })
      }
      factionDetail += `Active States : ${activeStates}\n`
      let pendingStates: string = ''
      if (pendingStatesArray.length === 0) {
        pendingStates = 'None'
      } else {
        pendingStatesArray.forEach((pendingState, index, factionPendingStates) => {
          const trend = StringHelpers.getTrendIcon(pendingState.trend)
          pendingStates = `${pendingStates}${fdevIds.state[pendingState.state].name}${trend}`
          if (index !== factionPendingStates.length - 1) {
            pendingStates = `${pendingStates}, `
          }
        })
      }
      factionDetail += `Pending States : ${pendingStates}\n`
      let recoveringStates: string = ''
      if (recoveringStatesArray.length === 0) {
        recoveringStates = 'None'
      } else {
        recoveringStatesArray.forEach((recoveringState, index, factionRecoveringState) => {
          const trend = StringHelpers.getTrendIcon(recoveringState.trend)
          recoveringStates = `${recoveringStates}${fdevIds.state[recoveringState.state].name}${trend}`
          if (index !== factionRecoveringState.length - 1) {
            recoveringStates = `${recoveringStates}, `
          }
        })
      }
      factionDetail += `Recovering States : ${recoveringStates}`
      let fieldTitle = faction.name
      if (faction.faction_id === controlling) {
        fieldTitle += '👑'
      }
      fieldRecord.push({
        fieldTitle: fieldTitle,
        fieldDescription: factionDetail,
        name: faction.name,
        influence: faction.faction_details.faction_presence.influence
      })
    }

    const guild = await readGuild(interaction.guild)

    if (guild.sort && guild.sort_order && guild.sort_order !== 0) {
      fieldRecord.sort((a, b) => {
        if (guild.sort === 'name') {
          if (guild.sort_order === -1) {
            if (a.name.toLowerCase() < b.name.toLowerCase()) {
              return 1
            } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
              return -1
            } else {
              return 0
            }
          } else if (guild.sort_order === 1) {
            if (a.name.toLowerCase() < b.name.toLowerCase()) {
              return -1
            } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
              return 1
            } else {
              return 0
            }
          } else {
            return 0
          }
        } else if (guild.sort === 'influence') {
          if (guild.sort_order === -1) {
            return b.influence - a.influence
          } else if (guild.sort_order === 1) {
            return a.influence - b.influence
          } else {
            return 0
          }
        } else {
          return 0
        }
      })
    }

    const embed = new EmbedBuilder()
      .setTitle('System Status')
      .setColor([255, 0, 255])
      .addFields({ name: systemName, value: systemState })
      .setTimestamp(new Date())

    for (const field of fieldRecord) {
      embed.addFields({ name: field.fieldTitle, value: field.fieldDescription })
    }

    await interaction.editReply({ embeds: [embed] })
  }

  async execMessage(message: Message, commandArguments: string): Promise<void> {
    message.channel.send(Responses.getResponse(Responses.USESLASH))
  }

  // Method is deprecated
  help(): [string, string, string, string[]] {
    return ['', '', '', []]
  }
}
