import { IsString, IsNumber } from 'class-validator';

export class CreateGpDto {
  @IsString()
  streamId: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsNumber()
  altitude: number;

  @IsNumber()
  speed: number;
}
