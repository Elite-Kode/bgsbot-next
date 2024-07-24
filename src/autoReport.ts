import { CronJobStore } from './interfaces/typings'
import { ChannelType, Client, PermissionsBitField, TextChannel } from 'discord.js'
import { Guild } from './db/guild'
import { Report } from './discord/commands'
import { Pagination } from './discord/pagination'
import { CronJob } from 'cron'
import { Responses } from './discord/responseDict'

export class AutoReport {
  private static jobs: CronJobStore[]

  /*
  Populates the array with cron jobs for configured guilds
   */
  public static loadJobs(guilds: Guild[], client: Client) {
    for (const guild of guilds) {
      if (
        !guild.bgs_time ||
        guild.bgs_time.length === 0 ||
        !guild.bgs_channel_id ||
        guild.bgs_channel_id.length === 0
      ) {
        return
      }

      // Add an entry if the guild has it configured
      this.updateEntry(guild, client)
    }
  }

  /*
  Updates the guid's cronjob entry. Call this after changing the guild's settings
   */
  public static updateEntry(guild: Guild, client: Client) {
    if (!guild.bgs_time || guild.bgs_time.length === 0 || !guild.bgs_channel_id || guild.bgs_channel_id.length === 0) {
      console.warn('Tried to update an entry for an badly configured guild')
      return
    }

    const cronPattern = `${guild.bgs_time.split(':')[2]} ${guild.bgs_time.split(':')[1]} ${
      guild.bgs_time.split(':')[0]
    } * * *`
    const cronJob = new CronJob(cronPattern, async () => {
      await this.processJob(guild, client)
    })

    const index = this.jobs.findIndex(element => {
      return element.guild_id === guild.guild_id
    })

    if (index === -1) {
      this.jobs.push({
        cronJob,
        guild_id: guild.guild_id,
        time: guild.bgs_time
      })
    } else {
      this.jobs[index].cronJob.stop()
      this.jobs[index] = {
        cronJob,
        guild_id: guild.guild_id,
        time: guild.bgs_time
      }
    }

    cronJob.start()
  }

  public static deleteEntry(guild: Guild) {
    const index = this.jobs.findIndex(element => {
      return element.guild_id === guild.guild_id
    })

    if (index === -1) {
      this.jobs[index].cronJob.stop()
      this.jobs.splice(index, 1)
    }
  }

  /*
  This method is called by each cron job to generate the report and post an appropriate message
   */
  private static async processJob(guild: Guild, client: Client) {
    const bgsChannel = client.guilds.cache.get(guild.guild_id).channels.cache.get(guild.bgs_channel_id)

    if (!bgsChannel || bgsChannel.type !== ChannelType.GuildText) {
      console.log(`BGS channel for guild ${guild.guild_id} is invalid`)
      return
    }

    const report = new Report()
    const fields = await report.generateFields(guild)
    const embeds = Pagination.generateEmbeds(fields, '', '', 'Automated Report', 10)

    if (
      !client.guilds.cache
        .get(guild.guild_id)
        .members.me.permissionsIn(guild.bgs_channel_id)
        .has([PermissionsBitField.Flags.EmbedLinks, PermissionsBitField.Flags.AttachFiles])
    ) {
      await (bgsChannel as TextChannel).send({ content: Responses.getResponse(Responses.EMBEDPERMISSION) })
      return
    }

    for (const embed of embeds) {
      await (bgsChannel as TextChannel).send({ embeds: [embed] })
    }
  }
}
