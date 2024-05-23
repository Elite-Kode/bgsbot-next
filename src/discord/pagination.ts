import { FieldRecordSchema } from '../interfaces/typings'
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'

export class Pagination {
  public static async paginateAndRespond(
    interaction: ChatInputCommandInteraction,
    fieldRecords: FieldRecordSchema[],
    firstFieldName: string,
    firstFieldValue: string,
    title: string,
    fieldsPerPage: number
  ) {
    const numberOfMessages = Math.ceil(fieldRecords.length / fieldsPerPage)
    console.log(`Paginating over ${numberOfMessages} messages (${fieldRecords.length})`)
    for (let index = 0; index < numberOfMessages; index++) {
      const embed = new EmbedBuilder()
      embed.setTitle(`${title} - ${index + 1} of ${numberOfMessages}`)
      embed.setColor([255, 0, 255])
      if (firstFieldName !== '' && firstFieldValue !== '') {
        embed.addFields({ name: firstFieldName, value: firstFieldValue })
      }
      embed.setTimestamp(new Date())
      let limit = 0
      if (fieldRecords.length > index * fieldsPerPage + fieldsPerPage) {
        limit = index * fieldsPerPage + fieldsPerPage
      } else {
        limit = fieldRecords.length
      }
      for (let recordIndex = index * fieldsPerPage; recordIndex < limit; recordIndex++) {
        embed.addFields({
          name: fieldRecords[recordIndex].fieldTitle,
          value: fieldRecords[recordIndex].fieldDescription
        })
      }

      if (index === 0) {
        await interaction.editReply({ embeds: [embed] })
      } else {
        await interaction.followUp({ embeds: [embed] })
      }
    }
  }
}
