export enum Speaker {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system',
}

export interface TranscriptEntry {
  speaker: Speaker;
  text: string;
  isFinal: boolean;
}
