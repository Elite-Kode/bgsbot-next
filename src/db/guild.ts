import { Document, model, Schema } from 'mongoose'

export interface Guild {
  guild_id: string
  bgs_channel_id: string
  bgs_role_id: string
  bgs_time: string
  announce_tick: boolean
  sort: string
  sort_order: number
  theme: string
  admin_roles_id: string[]
  forbidden_roles_id: string[]
  created_at: Date
  updated_at: Date
  monitor_systems: {
    primary: boolean
    system_name: string
    system_name_lower: string
    system_pos: {
      x: number
      y: number
      z: number
    }
  }[]
  monitor_factions: {
    primary: boolean
    faction_name: string
    faction_name_lower: string
  }[]
}

export interface GuildSchema extends Document, Guild {}

export const GuildSchema = new Schema<GuildSchema>({
  guild_id: {
    type: String,
    unique: true
  },
  bgs_channel_id: String,
  bgs_role_id: String,
  bgs_time: String,
  announce_tick: Boolean,
  sort: String,
  sort_order: Number, // 1 of increasing and -1 for decreasing and 0 for disable
  theme: String,
  admin_roles_id: [String],
  forbidden_roles_id: [String],
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: Date,
  monitor_systems: [
    {
      _id: false,
      primary: Boolean,
      system_name: String,
      system_name_lower: String,
      system_pos: {
        x: Number,
        y: Number,
        z: Number
      }
    }
  ],
  monitor_factions: [
    {
      _id: false,
      primary: Boolean,
      faction_name: String,
      faction_name_lower: String
    }
  ]
})

export const GuildModel = model<Guild>('guild', GuildSchema, 'guild')
