import { Injectable, Logger } from '@nestjs/common'
import type {
  EAClubsProvider,
  EAClubsProviderGetRecentInput,
  EAClubRecentMatch,
} from './ea-clubs.types'

/** Implémentation sûre par défaut : aucun match distant tant que l’API EA n’est pas câblée. */
@Injectable()
export class EaClubsStubProvider implements EAClubsProvider {
  private readonly logger = new Logger(EaClubsStubProvider.name)

  async getRecentMatches(input: EAClubsProviderGetRecentInput): Promise<EAClubRecentMatch[]> {
    this.logger.debug(
      `[EA_STUB] getRecentMatches eaClubId=${input.eaClubId} platform=${input.platform} → []`,
    )
    return []
  }
}
