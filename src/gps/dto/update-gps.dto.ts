import { PartialType } from '@nestjs/mapped-types';
import { CreateGpDto } from './create-gps.dto';

export class UpdateGpDto extends PartialType(CreateGpDto) {
  id: number;
}
