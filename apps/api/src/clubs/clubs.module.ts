import { Module } from '@nestjs/common';
import { ClubsService } from './clubs.service';
import { ClubsController } from './clubs.controller'; // 1. Importe le contrôleur

@Module({
  controllers: [ClubsController], // 2. Ajoute-le ici
  providers: [ClubsService],
  exports: [ClubsService],
})
export class ClubsModule {}