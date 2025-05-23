import { PartialType } from '@nestjs/mapped-types';
import { CreateStreamDto } from './create-streaming.dto';

export class UpdateStreamingDto extends PartialType(CreateStreamDto) {}
