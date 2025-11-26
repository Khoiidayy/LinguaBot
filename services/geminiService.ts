import { GoogleGenAI, Chat } from "@google/genai";
import { VocabSet } from '../types';

// Initialize Gemini Client
// Note: In a production app, never expose API keys on the client.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const createTutorChat = (vocabSets: VocabSet[]): Chat => {
  // We flatten the sets for the prompt context, but keep structure so user can select
  const setsDescription = vocabSets.map(set => 
    `Set Name: "${set.name}" (Contains: ${set.words.map(w => `${w.word}=${w.definition}`).join(', ')})`
  ).join('\n');

  const systemInstruction = `
    You are a strict and helpful Language Tutor Chatbot.
    
    Here is the User's Vocabulary Database:
    ${setsDescription}

    Your functionality is governed by these rules:
    
    1. INITIAL STATE: When the conversation starts (or is reset), you must output EXACTLY: "Press 1 to select a vocabulary set, press 2 to start practicing."
    
    2. SELECTION (Option 1): 
       - If the user sends "1", list the available Set Names from the database above. Ask the user to type the name of the set they want to study.
       - If the user types a valid Set Name, confirm it is selected and say "Set [Name] selected. Press 2 to start."
       - Remember the selected set.

    3. PRACTICE (Option 2):
       - If the user sends "2":
         - If NO set is selected, tell them "Please press 1 to select a vocabulary set first."
         - If a set IS selected, start the quiz.
    
    4. QUIZ MECHANIC:
       - You (the AI) provide the DEFINITION of a random word from the selected set.
       - The User must type the WORD.
       - If the User's answer is correct (matches the word), say "Correct!" and provide the next definition.
       - If the User's answer is incorrect, say "Incorrect. The answer was [Word]." and provide the next definition.
       - Keep quizzing indefinitely until the user asks to stop or switch.

    5. GENERAL:
       - Be encouraging but precise with spelling.
       - If the database is empty, tell the user to go back and add vocabulary first.
  `;

  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.7, // Slightly creative but focused
    },
  });
};
