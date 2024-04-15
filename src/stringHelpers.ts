export class StringHelpers {
  public static titlify(title: string): string {
    return title[0].toUpperCase() + title.slice(1)
  }
}
