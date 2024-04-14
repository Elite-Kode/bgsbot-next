import { Guild, User } from 'discord.js'
import { readGuild } from '../db/guild'

export enum AccessLevel {
  UNKNOWN = 0,
  FORBIDDEN = 1,
  ACCESS = 2,
  ADMIN = 3
}

export class Access {
  public static async has(author: User, guild: Guild, requiredAccessLevel: AccessLevel): Promise<boolean> {
    const accessLevel = await this.generateAccessLevel(author, guild)

    return accessLevel >= requiredAccessLevel
  }

  static async generateAccessLevel(author: User, guild: Guild): Promise<AccessLevel> {
    const member = await guild.members.fetch(author)

    const dbGuild = await readGuild(guild)
    const roles = member.roles.cache

    if (member.permissions.has('Administrator')) return AccessLevel.ADMIN

    for (const roleId of dbGuild.forbidden_roles_id) {
      if (roles.has(roleId)) return AccessLevel.FORBIDDEN
    }

    for (const roleId of dbGuild.admin_roles_id) {
      if (roles.has(roleId)) return AccessLevel.ADMIN
    }

    for (const roleId of dbGuild.access_roles_id) {
      if (roles.has(roleId)) return AccessLevel.ACCESS
    }

    return AccessLevel.UNKNOWN
  }
}
