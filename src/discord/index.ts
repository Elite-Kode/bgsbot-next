import { Client, Events, GatewayIntentBits } from 'discord.js'

export class DiscordClient {
  public client: Client

  public constructor() {
    this.client = new Client({ intents: GatewayIntentBits.Guilds })
    this.listen()
    this.login()
  }

  public login() {
    this.client.login(process.env.DISCORD_TOKEN)
  }

  public listen() {
    this.client.once(Events.ClientReady, readyClient => {
      console.log(`I am ready! Logged in as ${readyClient.user.tag}`)
    })
  }
}
