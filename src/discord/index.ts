import { Client, Events, GatewayIntentBits, Message } from 'discord.js'
import { Hi } from './commands'
import { Command } from '../interfaces/Command'
import { Responses } from './responseDict'

export class DiscordClient {
  public client: Client
  public commandsMap: Map<string, Command>

  public constructor() {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
    })
    this.commandsMap = new Map()
    this.listen()
    this.login()
  }

  public login() {
    this.client.login(process.env.DISCORD_TOKEN)
  }

  public listen() {
    this.client.on(Events.ClientReady, readyClient => {
      console.log(`I am ready! Logged in as ${readyClient.user.tag}`)
      this.initiateCommands()
    })

    this.client.on(Events.MessageCreate, async message => {
      if (message.mentions.users.has(this.client.user.id)) {
        this.process(message)
      }
    })
  }

  private initiateCommands(): void {
    const hi = new Hi()

    this.commandsMap.set('hi', hi)
  }

  private process(message: Message) {
    const commandArguments = this.getCommandArguments(message)
    if (this.commandsMap.has(commandArguments.command)) {
      console.log(commandArguments.command + ' command requested')
      this.commandsMap.get(commandArguments.command).exec(message, commandArguments.commandArguments)
    } else {
      message.channel.send(Responses.getResponse(Responses.NOTACOMMAND))
    }
  }

  private getCommandArguments(message: Message) {
    const messageString = message.content.replace(new RegExp(`<@!?${this.client.user.id}>`), '').trim()
    const messageArray = messageString.split(' ')
    const command = messageArray[0].toLowerCase()
    let commandArguments: string = ''
    if (messageArray.length > 1) {
      commandArguments = messageArray.slice(1, messageArray.length).join(' ')
    }
    return { command, commandArguments }
  }
}
