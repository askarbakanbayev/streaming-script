import { ChildProcessWithoutNullStreams } from 'child_process';

export interface StreamEntity {
  id: string;
  name: string;
  rtmpUrl: string;
  rtspUrl: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  process: any;
  inputSource: string;
  logPath: string;
  restartAttempts: number;
  startTime?: string;
}
