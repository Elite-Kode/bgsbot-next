export class StringHelpers {
  public static titlify(title: string): string {
    return title[0].toUpperCase() + title.slice(1)
  }

  public static getTrendIcon(trend: number): string {
    if (trend > 0) {
      return '⬆️'
    } else if (trend < 0) {
      return '⬇️'
    } else {
      return '↔️'
    }
  }
}
