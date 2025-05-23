import { Injectable } from '@nestjs/common';
import { CreateGpDto } from './dto/create-gps.dto';

@Injectable()
export class GpsService {
  private positions = new Map<string, CreateGpDto>();

  create(dto: CreateGpDto) {
    this.positions.set(dto.streamId, dto);
    return { success: true };
  }

  findAll() {
    return Array.from(this.positions.values());
  }

  findOne(streamId: string) {
    return this.positions.get(streamId);
  }

  update(id: string, dto: Partial<CreateGpDto>) {
    const existing = this.positions.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...dto };
    this.positions.set(id, updated);
    return updated;
  }

  remove(id: string) {
    return this.positions.delete(id);
  }
}
