import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @IsOptional()
  @IsUUID()
  receiverId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  content!: string;
}
