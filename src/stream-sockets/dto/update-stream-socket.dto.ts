import { PartialType } from '@nestjs/mapped-types';
import { CreateStreamSocketDto } from './create-stream-socket.dto';

export class UpdateStreamSocketDto extends PartialType(CreateStreamSocketDto) {
  id: number;
}
