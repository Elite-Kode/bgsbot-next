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

    const fieldRecord: FieldRecordSchema[] = []
    for (const system of presence) {
      const state = fdevIds.state[system.state].name
      const influence = system.influence
      const filtered = faction.history.filter(systemEach => {
        return systemEach.system_lower === system.system_name_lower
      })
      const influenceDifference = filtered.length === 2 ? influence - filtered[1].influence : 0
      const happiness = fdevIds.happiness[system.happiness].name
      const activeStatesArray = system.active_states
      const pendingStatesArray = system.pending_states
      const recoveringStatesArray = system.recovering_states
      let influenceDifferenceText
      if (influenceDifference > 0) {
        influenceDifferenceText = `📈${(influenceDifference * 100).toFixed(1)}%`
      } else if (influenceDifference < 0) {
        influenceDifferenceText = `📉${(-influenceDifference * 100).toFixed(1)}%`
      } else {
        influenceDifferenceText = `🔷${(influenceDifference * 100).toFixed(1)}%`
      }
      const updateDate = new Date(system.updated_at)
      const suffix = updateDate.getTime() > tickDate.getTime() ? 'after' : 'before'
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
      fieldRecord.push({
        fieldTitle: system.system_name,
        fieldDescription: factionDetail,
        name: system.system_name,
        influence: system.influence
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
    const numberOfMessages = Math.ceil(fieldRecord.length / 24)
    for (let index = 0; index < numberOfMessages; index++) {
      const embed = new EmbedBuilder()
      embed.setTitle(`Faction Status - ${index + 1} of ${numberOfMessages}`)
      embed.setColor([255, 0, 255])
      embed.addFields({ name: factionName, value: government })
      embed.setTimestamp(new Date())
      let limit = 0
      if (fieldRecord.length > index * 24 + 24) {
        limit = index * 24 + 24
      } else {
        limit = fieldRecord.length
      }
      for (let recordIndex = index * 24; recordIndex < limit; recordIndex++) {
        embed.addFields({ name: fieldRecord[recordIndex].fieldTitle, value: fieldRecord[recordIndex].fieldDescription })
      }

      if (index === 0) {
        await interaction.editReply({ embeds: [embed] })
      } else {
        await interaction.followUp({ embeds: [embed] })
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
}
