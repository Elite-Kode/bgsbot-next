import { connect, connection } from 'mongoose'
import { exit } from 'node:process'
import './guild' // Create the mongoose models as side effect

export class DB {
  private readonly userName: string
  private readonly password: string
  private readonly url: string

  constructor() {
    this.userName = process.env.DB_USER
    this.password = process.env.DB_PASS
    this.url = process.env.DB_URL
  }

  public async connectToDB() {
    this.listenToEvents()
    try {
      await connect(this.url, {
        user: this.userName,
        pass: this.password
      })
    } catch (err) {
      console.error(err)
    }
  }

  private listenToEvents(): void {
    connection.on('connected', () => {
      console.log(`Connected to ${this.url}`)
    })

    connection.on('error', err => {
      console.log(`Mongoose error ${err}`)
    })

    connection.on('disconnected', () => {
      console.log('Mongoose connection disconnected')
    })

    process.on('SIGINT', async () => {
      await connection.close()
      console.log('Connection closed via app termination')
      exit(0)
    })
  }
}
