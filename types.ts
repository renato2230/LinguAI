export interface Participant {
  id: string;
  name: string;
  languageCode: string;
  voiceName: string;
  color: string; // e.g., 'border-sky-500'
}

export interface TranscriptTurn {
  id: number;
  speaker: Participant;
  originalText: string;
  translations: Record<string, string>; // { 'en': 'Hello', 'fr': 'Bonjour' }
  isFinal: boolean;
}
