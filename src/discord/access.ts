import { Guild, User } from 'discord.js'
import { readGuild } from '../db/guild'

export enum AccessLevel {
  FORBIDDEN = 0,
  ACCESS = 1,
  ADMIN = 2
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

    for (const forbiddenRoleId of dbGuild.forbidden_roles_id) {
      if (roles.has(forbiddenRoleId)) return AccessLevel.FORBIDDEN
    }

    for (const adminRoleId of dbGuild.admin_roles_id) {
      if (roles.has(adminRoleId)) return AccessLevel.ADMIN
    }

    for (const accessRoleId of dbGuild.access_roles_id) {
      if (roles.has(accessRoleId)) return AccessLevel.ACCESS
    }
  }
}
