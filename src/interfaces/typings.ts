export interface IngameIdsSchema {
  state: any
  superpower: any
  economy: any
  government: any
  security: any
  station: any
  happiness: any
}

export type TickType = TickSchema[]
export interface TickSchema {
  _id: string
  time: string
  updated_at: string
}
