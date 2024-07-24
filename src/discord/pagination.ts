import { FieldRecordSchema } from '../interfaces/typings'
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'
import { Responses } from './responseDict'

export class Pagination {
  public static async paginateAndRespond(
    interaction: ChatInputCommandInteraction,
    fieldRecords: FieldRecordSchema[],
    firstFieldName: string,
    firstFieldValue: string,
    title: string,
    fieldsPerPage: number
  ) {
    const embeds = this.generateEmbeds(fieldRecords, firstFieldName, firstFieldValue, title, fieldsPerPage)

    if (embeds.length === 0) {
      await interaction.editReply({content: Responses.getResponse(Responses.NOTFOUND)})
    }

    for (let i = 0; i < embeds.length; i++) {
      if (i === 0) {
        await interaction.editReply({ embeds: [embeds[i]] })
      } else {
        await interaction.followUp({ embeds: [embeds[i]] })
      }
    }
  }

  public static generateEmbeds(
    fieldRecords: FieldRecordSchema[],
    firstFieldName: string,
    firstFieldValue: string,
    title: string,
    fieldsPerPage: number
  ): EmbedBuilder[] {
    const embeds: EmbedBuilder[] = []

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

      embeds.push(embed)
    }

    return embeds
  }
}
