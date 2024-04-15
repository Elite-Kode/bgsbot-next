export class DateHelpers {
  public static timeDifference(current: Date, previous: Date) {
    const msPerMinute = 60 * 1000
    const msPerHour = msPerMinute * 60
    const msPerDay = msPerHour * 24
    const msPerMonth = msPerDay * 30
    const msPerYear = msPerDay * 365

    const currentTime = current.getTime()
    const previousTime = previous.getTime()
    const elapsed = currentTime - previousTime
    const absElapsed = Math.abs(elapsed)

    const relative = new Intl.RelativeTimeFormat('en', { style: 'long' })

    if (absElapsed < msPerMinute) {
      return relative.format(Math.round(elapsed / 1000), 'second')
    } else if (absElapsed < msPerHour) {
      return relative.format(Math.round(elapsed / msPerMinute), 'minute')
    } else if (absElapsed < msPerDay) {
      return relative.format(Math.round(elapsed / msPerHour), 'hour')
    } else if (absElapsed < msPerMonth) {
      return relative.format(Math.round(elapsed / msPerDay), 'day')
    } else if (absElapsed < msPerYear) {
      return relative.format(Math.round(elapsed / msPerMonth), 'month')
    } else {
      return relative.format(Math.round(elapsed / msPerYear), 'year')
    }
  }

  public static timeSince(current: Date, previous: Date) {
    const msPerMinute = 60 * 1000
    const msPerHour = msPerMinute * 60
    const msPerDay = msPerHour * 24
    const msPerMonth = msPerDay * 30
    const msPerYear = msPerDay * 365

    const currentTime = current.getTime()
    const previousTime = previous.getTime()
    const elapsed = Math.abs(currentTime - previousTime)

    if (elapsed < msPerMinute) {
      return Math.round(elapsed / 1000) + ' seconds'
    } else if (elapsed < msPerHour) {
      return Math.round(elapsed / msPerMinute) + ' minutes'
    } else if (elapsed < msPerDay) {
      return Math.round(elapsed / msPerHour) + ' hours'
    } else if (elapsed < msPerMonth) {
      return Math.round(elapsed / msPerDay) + ' days'
    } else if (elapsed < msPerYear) {
      return Math.round(elapsed / msPerMonth) + ' months'
    } else {
      return Math.round(elapsed / msPerYear) + ' years'
    }
  }
}
