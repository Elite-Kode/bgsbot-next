import 'dotenv/config'
import { DiscordClient } from './discord'
import { DB } from './db'
import { FdevIds } from './fdevids'
import { TickDetector } from './tickDetector'
import { AutoReport } from './autoReport'
import { GuildModel } from './db/guild'

class App {
  public discordClient: DiscordClient
  public db: DB
  public tickDetector: TickDetector

  public constructor() {
    this.discordClient = new DiscordClient()
    this.db = new DB()
    this.tickDetector = new TickDetector(this.discordClient.client)
    this.setup()
  }

  private async setup() {
    await this.db.connectToDB()
    await this.generateFdevIds()
    await this.tickDetector.connectSocket()

    const guilds = await GuildModel.find()
    AutoReport.loadJobs(guilds, this.discordClient.client)
  }

  private generateFdevIds() {
    try {
      return FdevIds.initialiseIds()
    } catch (err) {
      console.error(err)
    }
  }
}

const app = new App()

export default app
