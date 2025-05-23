import {
  Controller,
  Get,
  Param,
  HttpException,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express'; // 👈 обязательно
import { SnapshotsService } from './snapshots.service';

@Controller('snapshots')
export class SnapshotsController {
  constructor(private readonly snapshotsService: SnapshotsService) {}

  @Get(':id/snapshot')
  getSnapshot(@Param('id') id: string, @Res() res: Response) {
    const filePath = this.snapshotsService.getLatestSnapshotPath(id);
    if (!filePath) {
      throw new HttpException('Snapshot not found', HttpStatus.NOT_FOUND);
    }

    return res.sendFile(filePath, { root: '.' });
  }
}
