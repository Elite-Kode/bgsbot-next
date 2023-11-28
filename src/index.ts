import 'dotenv/config'
import { DiscordClient } from './discord'

class App {
  public discordClient: DiscordClient

  public constructor() {
    this.discordClient = new DiscordClient()
  }
}

new App()
