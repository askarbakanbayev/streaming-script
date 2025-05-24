import { SnapshotsController } from './snapshots.controller';
import { SnapshotsService } from './snapshots.service';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('SnapshotsController', () => {
  let controller: SnapshotsController;
  let snapshotsService: SnapshotsService;

  const mockRes: any = {
    sendFile: jest.fn(),
  };

  beforeEach(() => {
    snapshotsService = {
      getLatestSnapshotPath: jest.fn(),
    } as any;

    controller = new SnapshotsController(snapshotsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should send snapshot file if found', () => {
    const mockFilePath = 'snapshots/drone-1.jpg';
    (snapshotsService.getLatestSnapshotPath as jest.Mock).mockReturnValue(
      mockFilePath,
    );

    controller.getSnapshot('drone-1', mockRes);

    expect(snapshotsService.getLatestSnapshotPath).toHaveBeenCalledWith(
      'drone-1',
    );
    expect(mockRes.sendFile).toHaveBeenCalledWith(mockFilePath, { root: '.' });
  });

  it('should throw 404 if snapshot not found', () => {
    (snapshotsService.getLatestSnapshotPath as jest.Mock).mockReturnValue(null);

    try {
      controller.getSnapshot('drone-404', mockRes);
      fail('Expected HttpException not thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      expect(err.getStatus()).toBe(HttpStatus.NOT_FOUND);
    }
  });
});
