import { SlashedCommand } from '../../interfaces/Command'
import {
  ChatInputCommandInteraction,
  Message,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder
} from 'discord.js'
import { Responses } from '../responseDict'
import axios from 'axios'
import { TickType } from '../../interfaces/typings'

export class Tick implements SlashedCommand {
  name = 'tick'
  description = 'Get tick'
  slash: SlashCommandSubcommandsOnlyBuilder

  constructor() {
    this.slash = new SlashCommandBuilder()
      .setName('tick')
      .setDescription('Tick information')
      .addSubcommand(subCommand =>
        subCommand
          .setName('get')
          .setDescription('Get the latest tick')
          .addBooleanOption(option => option.setName('hide').setRequired(false).setDescription('Respond only to you?'))
      )
  }

  async execInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
    if (interaction.options.getSubcommand() === 'get') {
      // await interaction.reply(await this.getTick())
      await interaction.reply({
        content: await this.getTick(),
        ephemeral: interaction.options.getBoolean('hide') ?? false
      })
    }
  }

  async execMessage(message: Message, commandArguments: string): Promise<void> {
    message.channel.send(Responses.getResponse(Responses.USESLASH))
  }

  // Method is deprecated
  help(): [string, string, string, string[]] {
    return ['', '', '', []]
  }

  async getTick(): Promise<string> {
    const url = 'https://elitebgs.app/api/ebgs/v5/ticks'

    const response = await axios.get(url)
    if (response.status === 200) {
      const body: TickType = response.data
      if (body.length === 0) {
        return Responses.getResponse(Responses.FAIL)
      } else {
        return body[0].time
      }
    } else {
      console.error('Tick retrieval failed: {}', response.statusText)
      return Responses.getResponse(Responses.FAIL)
    }
  }
}
