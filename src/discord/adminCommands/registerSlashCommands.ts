import { Command, SlashedCommand } from '../../interfaces/Command'
import { ChannelType, Message, REST, Routes, Snowflake, TextChannel } from 'discord.js'

export class RegisterSlashCommands implements Command {
  name = 'registerslashcommands'
  description = 'Run script to register or update registered slash commands'
  applicationId: Snowflake
  rest: REST
  commandsMap: Map<string, SlashedCommand>

  constructor(applicationId: Snowflake, rest: REST, commandsMap: Map<string, SlashedCommand>) {
    this.applicationId = applicationId
    this.rest = rest
    this.commandsMap = commandsMap
  }

  async execMessage(message: Message, commandArguments: string) {
    if (commandArguments.length === 0 && message.channel.type == ChannelType.GuildText) {
      try {
        await this.register(message.channel)
      } catch (err) {
        console.log(err)
      }
    }
  }

  async register(channel: TextChannel) {
    const commands = Array.from(this.commandsMap, ([, command]) => {
      return command.slash.toJSON()
    })
    const response: any = await this.rest.put(Routes.applicationCommands(this.applicationId), { body: commands })
    channel.send(`Successfully reloaded ${response.length} application (/) commands.`)
  }

  help(): [string, string, string, string[]] {
    return [this.name, this.description, 'registerslashcommands', ['`@BGSBot registerslashcommands`']]
  }
}
