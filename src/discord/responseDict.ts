export class Responses {
  public static readonly SUCCESS = ['Your wish is my command!', 'All done boss! :thumbsup:', 'It is done! :ok_hand:']
  public static readonly FAIL = [
    "Um...sorry couldn't do that",
    'Computer says no',
    'Oops! problem... :frowning:',
    'Eeek! problems :frowning:'
  ]
  public static readonly NOPARAMS = [
    'Um...I think you are forgetting something',
    'I need more details to work on',
    'Yeah...go on!'
  ]
  public static readonly TOOMANYPARAMS = [
    'Aaah...thats too many details!',
    'No need to hurry. Give me the details one by one'
  ]
  public static readonly NOTACOMMAND = [
    'Um...were you trying to give me a command? If so you may be using the wrong one',
    "Sorry, I couldn't find that command"
  ]
  public static readonly INSUFFICIENTPERMS = [
    "You don't have the permissions to make me do that",
    "I'm sorry, I'm afraid I can't do that",
    "You can't do this. Ask someone with more permissions"
  ]
  public static readonly IDNOTFOUND = ['The ID you entered does not exist', "I couldn't find that"]
  public static readonly NOTATEXTCHANNEL = ['The entered channel is not a text channel. Please enter a text channel']
  public static readonly EMBEDPERMISSION = [
    "I don't have permissions to send a message and/or create an embed and/or attach files in the entered channel. Please assign the permissions to me."
  ]
  public static readonly USESLASH = ['Please use the slash command instead!']
  public static readonly ALREADYADDED = ['This has already been added', 'Already added! Try something else']

  public static getResponse(action: string[]): string {
    return action[Math.floor(Math.random() * action.length)]
  }
}
