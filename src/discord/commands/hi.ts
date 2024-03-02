import { SlashedCommand } from '../../interfaces/Command'
import { ChatInputCommandInteraction, Message, SlashCommandBuilder } from 'discord.js'

export class Hi implements SlashedCommand {
  name = 'hi'
  description = 'A sanity check to see if the bot is responding'
  slash: SlashCommandBuilder

  constructor() {
    this.slash = new SlashCommandBuilder().setName(this.name).setDescription(this.description)
  }

  async execMessage(message: Message, commandArguments: string) {
    if (commandArguments.length === 0) {
      message.channel.send(this.sendHey())
    }
  }

  async execInteraction(interaction: ChatInputCommandInteraction) {
    interaction.reply(this.sendHey())
  }

  sendHey() {
    return 'Hey there!'
  }

  help(): [string, string, string, string[]] {
    return [this.name, this.description, 'hi', ['`@BGSBot hi`']]
  }
}
