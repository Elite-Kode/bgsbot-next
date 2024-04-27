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

  public static influenceDifferenceText(influenceDifference: number): string {
    if (influenceDifference > 0) {
      return `📈${(influenceDifference * 100).toFixed(1)}%`;
    } else if (influenceDifference < 0) {
      return `📉${(-influenceDifference * 100).toFixed(1)}%`;
    } else {
      return `🔷${(influenceDifference * 100).toFixed(1)}%`;
    }
  }
}
