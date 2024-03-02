import {
  CacheType,
  ChatInputCommandInteraction,
  CommandInteractionOptionResolver,
  Message,
  SlashCommandBuilder
} from 'discord.js'

export interface Command {
  name: string
  description: string

  execMessage(message: Message, commandArguments: string): Promise<void>

  help(): [string, string, string, string[]]
}

export interface SlashedCommand extends Command {
  slash: SlashCommandBuilder

  execInteraction(
    interaction: ChatInputCommandInteraction,
    options: Omit<CommandInteractionOptionResolver<CacheType>, 'getMessage' | 'getFocused'>
  ): Promise<void>
}
