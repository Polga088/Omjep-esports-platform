import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { isEaClubsSyncEnabled } from '../ea-clubs-sync.config'
import type { EAClubsProvider } from './ea-clubs.types'
import { EaClubsStubProvider } from './ea-clubs.stub.provider'
import { EaClubsHttpProvider } from './ea-clubs.http.provider'

@Injectable()
export class EaClubsProviderFactory {
  private httpImpl?: EaClubsHttpProvider

  constructor(
    private readonly http: HttpService,
    private readonly stub: EaClubsStubProvider,
  ) {}

  /** Quand le flag est off ou sans URL HTTP, on reste sur le stub (aucune invention de stats). */
  create(): EAClubsProvider {
    if (!isEaClubsSyncEnabled()) return this.stub
    if (!process.env.EA_CLUBS_RECENT_MATCHES_URL?.trim()) return this.stub
    if (!this.httpImpl) this.httpImpl = new EaClubsHttpProvider(this.http)
    return this.httpImpl
  }
}
