import { FieldRecordSchema } from './interfaces/typings'
import { StringHelpers } from './stringHelpers'
import { FdevIds } from './fdevids'

export class ReportHelpers {
  public static sortByGuildPreference(
    input: FieldRecordSchema[],
    sort_order: number,
    sort: string
  ): FieldRecordSchema[] {
    input.sort((a, b) => {
      if (sort === 'name') {
        if (sort_order === -1) {
          if (a.name.toLowerCase() < b.name.toLowerCase()) {
            return 1
          } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
            return -1
          } else {
            return 0
          }
        } else if (sort_order === 1) {
          if (a.name.toLowerCase() < b.name.toLowerCase()) {
            return -1
          } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
            return 1
          } else {
            return 0
          }
        } else {
          return 0
        }
      } else if (sort === 'influence') {
        if (sort_order === -1) {
          return b.influence - a.influence
        } else if (sort_order === 1) {
          return a.influence - b.influence
        } else {
          return 0
        }
      } else {
        return 0
      }
    })

    return input
  }

  public static async generateStateString(stateArray: { state: string }[]): Promise<string> {
    if (stateArray.length === 0) {
      return 'None'
    } else {
      let workingString = ''
      const fdevIds = await FdevIds.getIds()
      stateArray.forEach((state, index, states) => {
        workingString = `${workingString}${fdevIds.state[state.state].name}`
        if (index !== states.length - 1) {
          workingString = `${workingString}, `
        }
      })
      return workingString
    }
  }

  public static async generateStateTrendString(stateArray: { state: string; trend: number }[]): Promise<string> {
    if (stateArray.length === 0) {
      return 'None'
    } else {
      let workingString = ''
      const fdevIds = await FdevIds.getIds()
      stateArray.forEach((state, index, states) => {
        const trend = StringHelpers.getTrendIcon(state.trend)
        workingString = `${workingString}${fdevIds.state[state.state].name}${trend}`
        if (index !== states.length - 1) {
          workingString = `${workingString}, `
        }
      })
      return workingString
    }
  }

  public static async generateStateStrings(
    activeStates: { state: string }[],
    pendingStates: { state: string; trend: number }[],
    recoveringStates: { state: string; trend: number }[]
  ): Promise<string> {
    let workingString = ``

    workingString += `Active States: ${await ReportHelpers.generateStateString(activeStates)}\n`
    workingString += `Pending States: ${await ReportHelpers.generateStateTrendString(pendingStates)}\n`
    workingString += `Recovering States: ${await ReportHelpers.generateStateTrendString(recoveringStates)}`

    return workingString
  }
}
