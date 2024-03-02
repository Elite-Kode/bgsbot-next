import { ChatInputCommandInteraction, Client, Events, GatewayIntentBits, Message } from 'discord.js'
import { Hi } from './commands'
import { Command, SlashedCommand } from '../interfaces/Command'
import { Responses } from './responseDict'
import { RegisterSlashCommands } from './adminCommands'

export class DiscordClient {
  public client: Client
  public commandsMap: Map<string, SlashedCommand>
  public adminCommandsMap: Map<string, Command>

  public constructor() {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
    })
    this.commandsMap = new Map()
    this.adminCommandsMap = new Map()
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
        this.processMessage(message)
      }
    })

    this.client.on(Events.InteractionCreate, interaction => {
      if (interaction.isChatInputCommand()) {
        this.processInteractions(interaction)
      }
    })
  }

  private initiateCommands(): void {
    const hi = new Hi()

    this.commandsMap.set(hi.name, hi)

    const registerSlashCommands = new RegisterSlashCommands(
      this.client.application.id,
      this.client.rest,
      this.commandsMap
    )

    this.adminCommandsMap.set(registerSlashCommands.name, registerSlashCommands)
  }

  private async processInteractions(interaction: ChatInputCommandInteraction) {
    if (!this.commandsMap.has(interaction.commandName)) {
      await interaction.channel.send(Responses.getResponse(Responses.NOTACOMMAND))
      return
    }
    console.log(interaction.commandName + ' slash command requested')
    await this.commandsMap.get(interaction.commandName).execInteraction(interaction, interaction.options)
  }

  private async processMessage(message: Message) {
    const commandArguments = this.getCommandArguments(message)
    if (!this.commandsMap.has(commandArguments.command) && !this.adminCommandsMap.has(commandArguments.command)) {
      await message.channel.send(Responses.getResponse(Responses.NOTACOMMAND))
      return
    }
    console.log(commandArguments.command + ' command requested')
    if (this.adminCommandsMap.has(commandArguments.command) && message.author.id == process.env.BOT_DEVELOPER_USER_ID) {
      await this.adminCommandsMap.get(commandArguments.command).execMessage(message, commandArguments.commandArguments)
      return
    }
    await this.commandsMap.get(commandArguments.command).execMessage(message, commandArguments.commandArguments)
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
