import { FieldRecordSchema } from '../interfaces/typings'
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'

export class Pagination {
  public static async paginateAndRespond(
    interaction: ChatInputCommandInteraction,
    fieldRecords: FieldRecordSchema[],
    firstFieldName: string,
    firstFieldValue: string
  ) {
    const numberOfMessages = Math.ceil(fieldRecords.length / 24)
    for (let index = 0; index < numberOfMessages; index++) {
      const embed = new EmbedBuilder()
      embed.setTitle(`Faction Status - ${index + 1} of ${numberOfMessages}`)
      embed.setColor([255, 0, 255])
      embed.addFields({ name: firstFieldName, value: firstFieldValue })
      embed.setTimestamp(new Date())
      let limit = 0
      if (fieldRecords.length > index * 24 + 24) {
        limit = index * 24 + 24
      } else {
        limit = fieldRecords.length
      }
      for (let recordIndex = index * 24; recordIndex < limit; recordIndex++) {
        embed.addFields({ name: fieldRecords[recordIndex].fieldTitle, value: fieldRecords[recordIndex].fieldDescription })
      }

      if (index === 0) {
        await interaction.editReply({ embeds: [embed] })
      } else {
        await interaction.followUp({ embeds: [embed] })
      }
    }
  }
}