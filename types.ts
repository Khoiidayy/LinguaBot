export interface WordItem {
  id: string;
  word: string;
  definition: string;
}

export interface VocabSet {
  id: string;
  name: string;
  words: WordItem[];
}

export interface User {
  username: string;
  password?: string; // stored plainly for this demo (localStorage)
  profileImage?: string;
  vocabSets: VocabSet[];
}

export type Screen = 
  | 'LOGIN' 
  | 'REGISTER' 
  | 'MAIN' 
  | 'SAVE_VOCAB' 
  | 'EDIT_SET' 
  | 'PRACTICE_MENU' 
  | 'PRACTICE_FLASHCARD' 
  | 'PRACTICE_1VS1' 
  | 'PRACTICE_MULTIPLE_CHOICE';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
