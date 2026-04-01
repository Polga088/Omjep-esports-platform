import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { LevelingModule } from '../leveling/leveling.module';
import { AuthModule } from '../auth';

@Module({
  imports: [AuthModule, LevelingModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
