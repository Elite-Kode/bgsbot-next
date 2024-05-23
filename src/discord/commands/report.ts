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
import { GuildModel, readGuild } from '../../db/guild'
import { Access, AccessLevel } from '../access'
import { FdevIds } from '../../fdevids'
import axios, { AxiosRequestConfig } from 'axios'
import { EBGSFactions, EBGSFactionsMinimal, EBGSSystemsDetailed, FieldRecordSchema } from '../../interfaces/typings'
import { ReportHelpers } from '../../reportHelpers'
import { StringHelpers } from '../../stringHelpers'
import { DateHelpers } from '../../dateHelpers'
import { Pagination } from '../pagination'

export class Report implements SlashedCommand {
  name = 'report'
  description = 'Report settings'
  slash: SlashCommandSubcommandsOnlyBuilder

  constructor() {
    this.slash = new SlashCommandBuilder()
      .setName(this.name)
      .setDescription(this.description)
      .addSubcommand(subcommand => subcommand.setName('generate').setDescription('Generate a BGS report'))
      .addSubcommandGroup(subcommandGroup =>
        subcommandGroup
          .setName('faction')
          .setDescription('Faction report settings')
          .addSubcommand(subcommand =>
            subcommand
              .setName('add')
              .setDescription('Add a faction to the report')
              .addStringOption(option =>
                option.setName('faction').setDescription('The faction to add').setRequired(true)
              )
              .addBooleanOption(option => option.setName('primary').setDescription('Primary?').setRequired(true))
          )
      )
  }

  async execInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand()
    const subcommandGroup = interaction.options.getSubcommandGroup()

    if (subcommand === 'generate') {
      await this.generateEmbed(interaction)
    } else if (subcommandGroup === 'faction') {
      if (subcommand === 'add') {
        await this.addFaction(interaction)
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

    await interaction.deferReply({ ephemeral: false })

    const tick = await new Tick().getTickData()
    const guild = await readGuild(interaction.guild)
    const fdevIds = await FdevIds.getIds()

    const primaryFactions = guild.monitor_factions.filter(v => v.primary).map(v => v.faction_name)
    const secondaryFactions = guild.monitor_factions.filter(v => !v.primary).map(v => v.faction_name)
    const factions = primaryFactions.concat(secondaryFactions)

    const primarySystems = guild.monitor_systems.filter(v => v.primary).map(v => v.system_name)
    const secondarySystems = guild.monitor_systems.filter(v => !v.primary).map(v => v.system_name)
    const systems = primarySystems.concat(secondarySystems)

    const usedFactions = []

    const promises = []
    let error = false
    for (const system of systems) {
      promises.push(async () => {
        const url = 'https://elitebgs.app/api/ebgs/v5/systems'
        const requestOptions: AxiosRequestConfig = {
          params: {
            name: system.toLowerCase(),
            factionDetails: true,
            factionHistory: true,
            count: 2
          }
        }
        const response = await axios.get(url, requestOptions)

        if (response.status !== 200) {
          await interaction.editReply(Responses.getResponse(Responses.FAIL))
          error = true
          return
        }

        const body: EBGSSystemsDetailed = response.data
        if (body.total === 0) {
          return [system, 'System not found\n', system]
        }

        const systemResponse = body.docs[0]

        let noFactionMonitoredInSystem = true
        for (const faction of systemResponse.factions) {
          if (factions.indexOf(faction.name) !== 1) {
            noFactionMonitoredInSystem = false
            break
          }
        }

        const primaryFields: FieldRecordSchema[] = []
        const secondaryFields: FieldRecordSchema[] = []

        for (const faction of systemResponse.factions) {
          const factionName = faction.name
          const influence = faction.faction_details.faction_presence.influence
          const happiness = fdevIds.happiness[faction.faction_details.faction_presence.happiness].name
          const activeStates = faction.faction_details.faction_presence.active_states
          const pendingStates = faction.faction_details.faction_presence.pending_states

          const activeStatesString = ReportHelpers.generateStateString(activeStates)
          const pendingStatesString = ReportHelpers.generateStateTrendString(pendingStates)

          if (primarySystems.includes(system) && primaryFactions.includes(faction.name)) {
            const filtered = systemResponse.faction_history.filter(factionEach => {
              return factionEach.faction_name_lower === faction.name_lower
            })
            let influenceDifference = 0
            if (filtered.length === 2) {
              influenceDifference = influence - filtered[1].influence
            }
            const influenceDifferenceText = StringHelpers.influenceDifferenceText(influenceDifference)

            let factionDetail = `Current ${StringHelpers.acronym(factionName)} Influence : ${(influence * 100).toFixed(
              1
            )}%${influenceDifferenceText}\n`
            factionDetail += `Current ${StringHelpers.acronym(factionName)} Happiness : ${happiness}\n`

            factionDetail += `Active ${StringHelpers.acronym(factionName)} State : ${activeStatesString}\n`
            factionDetail += `Pending ${StringHelpers.acronym(factionName)} State : ${pendingStatesString}\n`
            primaryFields.push({
              fieldDescription: factionDetail,
              name: factionName,
              fieldTitle: '',
              influence
            })
          } else {
            const record = {
              fieldDescription: `${StringHelpers.acronym(factionName)}: ${(influence * 100).toFixed(
                1
              )}% (${activeStates}. Pending ${pendingStates}) ${happiness}\n`,
              name: factionName,
              fieldTitle: '',
              influence
            }

            if (primaryFactions.includes(faction.name)) {
              primaryFields.push(record)
            } else if (secondaryFactions.includes(faction.name) || noFactionMonitoredInSystem) {
              secondaryFields.push(record)
            }
          }

          if (factions.includes(faction.name) && !usedFactions.includes(faction.name)) {
            usedFactions.push(faction.name)
          }
        }

        if (guild.sort && guild.sort_order && guild.sort_order !== 0) {
          ReportHelpers.sortByGuildPreference(primaryFields, guild.sort_order, guild.sort)
          ReportHelpers.sortByGuildPreference(secondaryFields, guild.sort_order, guild.sort)
        }

        let joined = ''
        const updateDate = new Date(systemResponse.updated_at)
        const tickDate = new Date(tick.time)
        const suffix = StringHelpers.beforeAfterSuffix(tickDate, updateDate)
        joined += `Last Updated: ${DateHelpers.timeDifference(updateDate, new Date())}, ${DateHelpers.timeSince(
          tickDate,
          updateDate
        )} ${suffix} last detected tick \n`

        for (const record of primaryFields.concat(secondaryFields)) {
          joined += record.fieldDescription
        }

        return [system, joined, system]
      })
    }

    const resolvedPromises: [string, string, string][] = await Promise.all(promises)
    if (error) return

    const fields: FieldRecordSchema[] = []
    for (const promise of resolvedPromises) {
      fields.push({
        fieldTitle: promise[0],
        fieldDescription: promise[1],
        influence: 0,
        name: promise[2]
      })
    }

    const unusedFactions = factions.filter(v => !usedFactions.includes(v))
    const unusedFactionDetails: [string, string, string, string, number][] = []
    for (const unusedFaction of unusedFactions) {
      const url = 'https://elitebgs.app/api/ebgs/v5/factions'
      const requestOptions: AxiosRequestConfig = {
        params: { name: unusedFaction.toLowerCase() }
      }
      const response = await axios.get(url, requestOptions)

      if (response.status !== 200) {
        await interaction.editReply(Responses.getResponse(Responses.FAIL))
        return
      }

      const body: EBGSFactions = response.data
      if (body.total === 0) {
        continue
      }

      const factionResponse = body.docs[0]
      const factionName = factionResponse.name

      for (const systemElement of factionResponse.faction_presence) {
        const influence = systemElement.influence
        const happiness = fdevIds.happiness[systemElement.happiness].name

        const activeStates = await ReportHelpers.generateStateString(systemElement.active_states)
        const pendingStates = await ReportHelpers.generateStateTrendString(systemElement.pending_states)

        const factionDetail = `${StringHelpers.acronym(factionName)} : ${(influence * 100).toFixed(
          1
        )}% (${activeStates}. Pending ${pendingStates}) ${happiness}\n`
        unusedFactionDetails.push([
          systemElement.system_name,
          factionDetail,
          factionName,
          systemElement.updated_at,
          influence
        ])
      }
    }

    if (unusedFactionDetails.length > 0) {
      unusedFactionDetails.sort((a, b) => {
        return a[0].toLowerCase().localeCompare(b[0].toLowerCase())
      })

      let previousSystem = unusedFactionDetails[0][0]
      const updateDate = new Date(unusedFactionDetails[0][3])
      const tickDate = new Date(tick.time)
      const suffix = StringHelpers.beforeAfterSuffix(tickDate, updateDate)
      let joined = `Last Updated: ${DateHelpers.timeDifference(updateDate, new Date())}, ${DateHelpers.timeSince(
        tickDate,
        updateDate
      )} ${suffix} last detected tick \n`

      for (const factionDetails of unusedFactionDetails) {
        if (factionDetails[0].toLowerCase() === previousSystem.toLowerCase()) {
          joined += factionDetails[1]
        } else {
          fields.push({
            fieldTitle: previousSystem,
            fieldDescription: joined,
            influence: 0,
            name: previousSystem
          })
          previousSystem = factionDetails[0]

          const updateDate = new Date(factionDetails[3])
          const tickDate = new Date(tick.time)
          const suffix = StringHelpers.beforeAfterSuffix(tickDate, updateDate)
          joined = `Last Updated: ${DateHelpers.timeDifference(updateDate, new Date())}, ${DateHelpers.timeSince(
            tickDate,
            updateDate
          )} ${suffix} last detected tick \n`
        }
      }

      fields.push({
        fieldTitle: previousSystem,
        fieldDescription: joined,
        influence: 0,
        name: previousSystem
      })

      await Pagination.paginateAndRespond(interaction, fields, '', '', 'BGS Report', 10)
    }
  }

  async addFaction(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!(await Access.has(interaction.user, interaction.guild, AccessLevel.ADMIN))) {
      await interaction.reply({ content: Responses.getResponse(Responses.INSUFFICIENTPERMS), ephemeral: true })
      return
    }

    const faction = interaction.options.getString('faction')
    const primary = interaction.options.getBoolean('primary')

    const url = 'https://elitebgs.app/api/ebgs/v5/factions'
    const requestOptions: AxiosRequestConfig = {
      params: {
        name: faction,
        minimal: true
      }
    }

    await interaction.deferReply({ ephemeral: true })
    const response = await axios.get(url, requestOptions)

    if (response.status !== 200) {
      await interaction.editReply({ content: Responses.getResponse(Responses.FAIL) })
      return
    }

    const body: EBGSFactionsMinimal = response.data
    if (body.total === 0) {
      await interaction.editReply({ content: Responses.getResponse(Responses.NOTFOUND) })
      return
    }

    const responseFaction = body.docs[0]
    const factionName = responseFaction.name
    const monitorFactions = {
      primary,
      faction_name: factionName,
      faction_name_lower: factionName.toLowerCase()
    }

    const guild = await readGuild(interaction.guild)

    try {
      await GuildModel.findOneAndUpdate(
        { guild_id: guild.guild_id },
        { updated_at: new Date(), $addToSet: { monitor_factions: monitorFactions } }
      )

      await interaction.editReply({ content: Responses.getResponse(Responses.SUCCESS) })
    } catch {
      await interaction.editReply({ content: Responses.getResponse(Responses.FAIL) })
    }
  }
}
