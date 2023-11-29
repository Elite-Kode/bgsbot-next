import { IngameIdsSchema } from './interfaces/typings'
import axios from 'axios'

export class FdevIds {
  private static ids: IngameIdsSchema

  static async initialiseIds() {
    const url = 'https://elitebgs.app/api/ingameids/all'

    const response = await axios.get(url)
    if (response.status == 200) {
      const body: IngameIdsSchema = response.data
      if (body) {
        FdevIds.ids = body
      } else {
        throw new Error(response.statusText)
      }
    } else {
      throw new Error(response.statusText)
    }
  }

  static async getIds() {
    if (FdevIds.ids) {
      return FdevIds.ids
    } else {
      await FdevIds.initialiseIds()
      return FdevIds.ids
    }
  }
}
