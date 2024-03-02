import { Command } from '../../interfaces/Command'
import { Message } from 'discord.js'

export class Hi implements Command {
  dmAble = true

  exec(message: Message, commandArguments: string): void {
    if (commandArguments.length === 0) {
      message.channel.send('Hey there!')
    }
  }

  help(): [string, string, string, string[]] {
    return ['hi', 'A sanity check to see if the bot is responding', 'hi', ['`@BGSBot hi`']]
  }
}
