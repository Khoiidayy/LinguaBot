import React, { useState, useEffect, useRef } from 'react';
import { User, Screen, VocabSet, WordItem, ChatMessage } from './types';
import * as Storage from './services/storageService';
import * as GeminiService from './services/geminiService';
import { 
  UserIcon, ChevronLeftIcon, BookIcon, GamepadIcon, 
  PlusIcon, SendIcon, CheckCircleIcon, XCircleIcon, TrashIcon 
} from './components/Icons';
import { Chat } from '@google/genai';

// --- Constants ---
const DEFAULT_AVATAR = "https://picsum.photos/200/200?random=1";
const ANIME_AVATAR_SEED = "https://api.dicebear.com/7.x/avataaars/svg?seed=";

const App: React.FC = () => {
  // Global State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>('LOGIN');
  
  // Specific View States
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Initialize from Storage
  useEffect(() => {
    const storedUser = Storage.getCurrentUser();
    if (storedUser) {
      setCurrentUser(storedUser);
      setCurrentScreen('MAIN');
    }
  }, []);

  // Handlers
  const handleLogout = () => {
    Storage.setCurrentUser(null);
    setCurrentUser(null);
    setCurrentScreen('LOGIN');
    setIsProfileOpen(false);
  };

  const updateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    Storage.saveUser(updatedUser);
  };

  const handleBack = () => {
    if (currentScreen === 'MAIN') return;
    if (currentScreen === 'SAVE_VOCAB' || currentScreen === 'PRACTICE_MENU') {
      setCurrentScreen('MAIN');
      return;
    }
    if (currentScreen === 'EDIT_SET') {
      setCurrentScreen('SAVE_VOCAB');
      return;
    }
    if (currentScreen.startsWith('PRACTICE_')) {
      setCurrentScreen('PRACTICE_MENU');
      return;
    }
    setCurrentScreen('MAIN');
  };

  // --- Components ---

  const Navbar = () => {
    if (!currentUser || currentScreen === 'LOGIN' || currentScreen === 'REGISTER') return null;

    const avatarUrl = currentUser.profileImage || `${ANIME_AVATAR_SEED}${currentUser.username}`;

    return (
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center">
            {currentScreen !== 'MAIN' && (
              <button onClick={handleBack} className="mr-3 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                <ChevronLeftIcon />
              </button>
            )}
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              LinguaBot
            </h1>
          </div>
          
          <button onClick={() => setIsProfileOpen(true)} className="relative group">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-blue-500 shadow-sm transition-transform group-hover:scale-105">
               <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            </div>
          </button>
        </div>
      </div>
    );
  };

  const ProfileModal = () => {
    if (!isProfileOpen || !currentUser) return null;

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
           updateUser({ ...currentUser, profileImage: reader.result as string });
        };
        reader.readAsDataURL(file);
      }
    };

    const avatarUrl = currentUser.profileImage || `${ANIME_AVATAR_SEED}${currentUser.username}`;

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in-up">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-24 relative">
             <button 
               onClick={() => setIsProfileOpen(false)} 
               className="absolute top-2 right-2 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition"
             >
               <XCircleIcon />
             </button>
          </div>
          <div className="px-6 pb-6 relative">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2">
               <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
                 <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
               </div>
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full shadow hover:bg-blue-700 transition"
               >
                 <PlusIcon className="w-4 h-4" />
               </button>
               <input 
                 type="file" 
                 ref={fileInputRef} 
                 className="hidden" 
                 accept="image/*" 
                 onChange={handleFileChange}
               />
            </div>
            
            <div className="mt-14 text-center">
              <h2 className="text-2xl font-bold text-gray-800">{currentUser.username}</h2>
              <p className="text-gray-500 text-sm mt-1">Language Learner</p>
              
              <div className="mt-6 flex justify-between text-sm text-gray-600 border-t pt-4">
                 <div className="text-center w-1/2 border-r">
                    <span className="block font-bold text-lg text-gray-800">{currentUser.vocabSets.length}</span>
                    <span>Sets</span>
                 </div>
                 <div className="text-center w-1/2">
                    <span className="block font-bold text-lg text-gray-800">
                      {currentUser.vocabSets.reduce((acc, set) => acc + set.words.length, 0)}
                    </span>
                    <span>Words</span>
                 </div>
              </div>

              <button 
                onClick={handleLogout}
                className="mt-6 w-full py-2.5 rounded-xl border border-red-200 text-red-600 font-medium hover:bg-red-50 transition"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const LoginScreen = () => {
    const [isRegister, setIsRegister] = useState(currentScreen === 'REGISTER');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      if (!username || !password) {
        setError("Please fill in all fields.");
        return;
      }

      if (isRegister) {
        if (password !== confirmPassword) {
           setError("Passwords do not match.");
           return;
        }
        if (/\s/.test(username)) {
          setError("Username must not contain spaces.");
          return;
        }
        const users = Storage.getUsers();
        if (users.some(u => u.username === username)) {
          setError("Username already exists.");
          return;
        }

        const newUser: User = { username, password, vocabSets: [] };
        Storage.saveUser(newUser);
        setCurrentUser(newUser);
        setCurrentScreen('MAIN');
      } else {
        const users = Storage.getUsers();
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
          setCurrentUser(user);
          setCurrentScreen('MAIN');
        } else {
          setError("Invalid credentials.");
        }
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-blue-600 mb-2">lingua.</h1>
            <p className="text-gray-500">Connect with languages.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <input 
              type="text" 
              placeholder="Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            {isRegister && (
              <input 
                type="password" 
                placeholder="Confirm Password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            )}

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button 
              type="submit" 
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition shadow-md"
            >
              {isRegister ? 'Sign Up' : 'Log In'}
            </button>
          </form>

          <div className="mt-6 text-center pt-6 border-t border-gray-100">
             <button 
               onClick={() => { setIsRegister(!isRegister); setError(''); }}
               className="text-sm font-semibold text-gray-700 hover:underline"
             >
               {isRegister ? 'Already have an account? Log In' : 'Create New Account'}
             </button>
          </div>
        </div>
      </div>
    );
  };

  const MainMenu = () => {
    return (
      <div className="p-4 max-w-md mx-auto space-y-6 mt-8">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome back!</h2>
            <p className="text-gray-500">Ready to learn something new today?</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setCurrentScreen('SAVE_VOCAB')}
            className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-md border border-gray-100 hover:shadow-xl hover:border-blue-200 transition group h-40"
          >
            <div className="bg-blue-100 p-4 rounded-full mb-3 group-hover:bg-blue-200 transition">
              <BookIcon className="w-8 h-8 text-blue-600" />
            </div>
            <span className="font-semibold text-gray-700">Save Vocab</span>
          </button>

          <button 
            onClick={() => setCurrentScreen('PRACTICE_MENU')}
            className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-md border border-gray-100 hover:shadow-xl hover:border-purple-200 transition group h-40"
          >
             <div className="bg-purple-100 p-4 rounded-full mb-3 group-hover:bg-purple-200 transition">
              <GamepadIcon className="w-8 h-8 text-purple-600" />
            </div>
            <span className="font-semibold text-gray-700">Practice</span>
          </button>
        </div>
      </div>
    );
  };

  const VocabManager = () => {
    const [newSetName, setNewSetName] = useState('');
    
    const handleCreateSet = () => {
      if (!newSetName.trim() || !currentUser) return;
      const newSet: VocabSet = {
        id: Date.now().toString(),
        name: newSetName,
        words: []
      };
      updateUser({ ...currentUser, vocabSets: [...currentUser.vocabSets, newSet] });
      setNewSetName('');
    };

    const handleDeleteSet = (setId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // prevent navigation
        if(!currentUser) return;
        const confirm = window.confirm("Are you sure you want to delete this set?");
        if(confirm) {
            updateUser({
                ...currentUser,
                vocabSets: currentUser.vocabSets.filter(s => s.id !== setId)
            });
        }
    }

    return (
      <div className="max-w-md mx-auto p-4 space-y-6">
        <div className="flex gap-2">
          <input 
            type="text" 
            value={newSetName}
            onChange={(e) => setNewSetName(e.target.value)}
            placeholder="New Set Name (e.g., Chapter 1)"
            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button 
            onClick={handleCreateSet}
            className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition"
          >
            <PlusIcon />
          </button>
        </div>

        <div className="space-y-3">
          {currentUser?.vocabSets.length === 0 && (
             <div className="text-center text-gray-400 py-10">
               No vocabulary sets yet. Create one above!
             </div>
          )}
          {currentUser?.vocabSets.map(set => (
            <div 
              key={set.id}
              onClick={() => { setEditingSetId(set.id); setCurrentScreen('EDIT_SET'); }}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition"
            >
              <div>
                <h3 className="font-bold text-gray-800">{set.name}</h3>
                <p className="text-xs text-gray-500">{set.words.length} words</p>
              </div>
              <button 
                onClick={(e) => handleDeleteSet(set.id, e)}
                className="text-gray-400 hover:text-red-500 p-2"
              >
                  <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const SetEditor = () => {
    const set = currentUser?.vocabSets.find(s => s.id === editingSetId);
    const [word, setWord] = useState('');
    const [def, setDef] = useState('');

    if (!set || !currentUser) return <div>Set not found</div>;

    const handleAddWord = () => {
      if (!word.trim() || !def.trim()) return;
      const newWord: WordItem = { id: Date.now().toString(), word, definition: def };
      const updatedSet = { ...set, words: [...set.words, newWord] };
      const updatedSets = currentUser.vocabSets.map(s => s.id === set.id ? updatedSet : s);
      updateUser({ ...currentUser, vocabSets: updatedSets });
      setWord('');
      setDef('');
    };
    
    const handleDeleteWord = (wordId: string) => {
        const updatedSet = { ...set, words: set.words.filter(w => w.id !== wordId) };
        const updatedSets = currentUser.vocabSets.map(s => s.id === set.id ? updatedSet : s);
        updateUser({ ...currentUser, vocabSets: updatedSets });
    }

    return (
      <div className="max-w-md mx-auto p-4 flex flex-col h-[calc(100vh-64px)]">
        <h2 className="text-xl font-bold text-gray-800 mb-4 px-1">{set.name}</h2>
        
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 mb-2 px-2 text-sm font-semibold text-gray-500">
           <div className="col-span-5">Word</div>
           <div className="col-span-6">Definition</div>
           <div className="col-span-1"></div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-2 pb-4 px-1">
          {set.words.map(w => (
            <div key={w.id} className="grid grid-cols-12 gap-2 bg-white p-3 rounded-lg shadow-sm border border-gray-100 items-center">
               <div className="col-span-5 font-medium break-words">{w.word}</div>
               <div className="col-span-6 text-gray-600 text-sm break-words">{w.definition}</div>
               <div className="col-span-1 flex justify-end">
                   <button onClick={() => handleDeleteWord(w.id)} className="text-gray-400 hover:text-red-500">
                       <XCircleIcon className="w-4 h-4" />
                   </button>
               </div>
            </div>
          ))}
          {set.words.length === 0 && (
             <p className="text-center text-gray-400 mt-10">No words added yet.</p>
          )}
        </div>

        {/* Input Area (Sticky Bottom) */}
        <div className="bg-white p-4 -mx-4 border-t border-gray-200 mt-auto">
          <div className="flex gap-2 mb-2">
            <input 
              className="w-1/2 p-3 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              placeholder="Word"
              value={word}
              onChange={e => setWord(e.target.value)}
            />
            <input 
              className="w-1/2 p-3 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              placeholder="Meaning"
              value={def}
              onChange={e => setDef(e.target.value)}
            />
          </div>
          <button 
            onClick={handleAddWord}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Add Row
          </button>
        </div>
      </div>
    );
  };

  const PracticeMenu = () => {
    return (
      <div className="max-w-md mx-auto p-4 space-y-4 mt-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Choose Mode</h2>
        
        {[
          { id: 'PRACTICE_FLASHCARD', title: 'Flashcards', desc: 'Classic flip cards study', color: 'bg-orange-500' },
          { id: 'PRACTICE_1VS1', title: '1 vs 1 Chat', desc: 'AI Tutor Challenge', color: 'bg-indigo-500' },
          { id: 'PRACTICE_MULTIPLE_CHOICE', title: 'Multiple Choice', desc: 'Test your memory', color: 'bg-emerald-500' },
        ].map(mode => (
          <button
            key={mode.id}
            onClick={() => setCurrentScreen(mode.id as Screen)}
            className="w-full bg-white p-4 rounded-2xl shadow-md border border-gray-100 flex items-center hover:shadow-lg hover:bg-gray-50 transition group"
          >
            <div className={`w-12 h-12 rounded-full ${mode.color} flex items-center justify-center mr-4 text-white shadow-sm group-hover:scale-110 transition`}>
               <GamepadIcon className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-lg text-gray-800">{mode.title}</h3>
              <p className="text-sm text-gray-500">{mode.desc}</p>
            </div>
          </button>
        ))}
      </div>
    );
  };

  const FlashcardMode = () => {
    const [selectedSet, setSelectedSet] = useState<VocabSet | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    if (!currentUser) return null;

    if (!selectedSet) {
      return (
        <div className="max-w-md mx-auto p-4">
          <h3 className="text-lg font-bold mb-4">Select a Set to Study</h3>
          <div className="space-y-3">
            {currentUser.vocabSets.map(set => (
              <button
                key={set.id}
                onClick={() => setSelectedSet(set)}
                className="w-full text-left bg-white p-4 rounded-xl shadow-sm border hover:border-blue-400 transition"
              >
                <span className="font-bold">{set.name}</span>
                <span className="float-right text-gray-400 text-sm">{set.words.length} words</span>
              </button>
            ))}
             {currentUser.vocabSets.length === 0 && <p className="text-center text-gray-500">No vocab sets available.</p>}
          </div>
        </div>
      );
    }

    if (selectedSet.words.length === 0) {
        return (
            <div className="p-8 text-center">
                <p className="text-gray-500 mb-4">This set is empty.</p>
                <button onClick={() => setSelectedSet(null)} className="text-blue-600 underline">Back</button>
            </div>
        )
    }

    const currentWord = selectedSet.words[currentIndex];

    return (
      <div className="max-w-md mx-auto p-4 flex flex-col items-center justify-center min-h-[80vh]">
         <div className="w-full flex justify-between items-center mb-6">
            <button onClick={() => setSelectedSet(null)} className="text-sm text-gray-500 hover:text-gray-800">Change Set</button>
            <span className="font-mono text-gray-400">{currentIndex + 1} / {selectedSet.words.length}</span>
         </div>

         <div 
           className="w-full h-80 relative cursor-pointer perspective-1000 group"
           onClick={() => setIsFlipped(!isFlipped)}
         >
            <div className={`relative w-full h-full duration-500 preserve-3d transition-transform ${isFlipped ? 'rotate-y-180' : ''}`} style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
               {/* Front */}
               <div className="absolute inset-0 backface-hidden bg-white border-2 border-blue-100 rounded-3xl shadow-xl flex items-center justify-center p-8 text-center">
                   <h3 className="text-3xl font-bold text-gray-800">{currentWord.word}</h3>
                   <span className="absolute bottom-4 text-xs text-gray-400 uppercase tracking-widest">Tap to flip</span>
               </div>
               {/* Back */}
               <div className="absolute inset-0 backface-hidden rotate-y-180 bg-blue-600 rounded-3xl shadow-xl flex items-center justify-center p-8 text-center text-white" style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}>
                   <p className="text-xl font-medium leading-relaxed">{currentWord.definition}</p>
               </div>
            </div>
         </div>

         <div className="flex gap-4 mt-8 w-full">
            <button 
               onClick={() => {
                   setIsFlipped(false);
                   setCurrentIndex(prev => prev > 0 ? prev - 1 : selectedSet.words.length - 1);
               }}
               className="flex-1 py-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 font-semibold text-gray-600"
            >
               Prev
            </button>
            <button 
               onClick={() => {
                   setIsFlipped(false);
                   setCurrentIndex(prev => prev < selectedSet.words.length - 1 ? prev + 1 : 0);
               }}
               className="flex-1 py-4 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 font-semibold"
            >
               Next
            </button>
         </div>
      </div>
    );
  };

  const Chat1vs1Mode = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [chatSession, setChatSession] = useState<Chat | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Initialize chat session on mount
    useEffect(() => {
        if (!currentUser) return;
        const chat = GeminiService.createTutorChat(currentUser.vocabSets);
        setChatSession(chat);
        
        const initChat = async () => {
            setLoading(true);
            try {
                // Send an empty message to trigger the system instruction's initial state if needed, 
                // but usually the system instruction is context. We can manually push the greeting based on the prompt reqs.
                // However, to ensure Gemini generates the exact string "Press 1...", let's send a "Start" prompt.
                const result = await chat.sendMessage({ message: "Start session" }); 
                const text = result.text || "";
                setMessages([{ role: 'model', text }]);
            } catch (e) {
                setMessages([{ role: 'model', text: "Error connecting to AI Tutor. Check API Key." }]);
            }
            setLoading(false);
        };
        initChat();
    }, [currentUser]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || !chatSession) return;
        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            const result = await chatSession.sendMessage({ message: userMsg });
            const text = result.text || "";
            setMessages(prev => [...prev, { role: 'model', text }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'model', text: "Connection error. Please try again." }]);
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] max-w-md mx-auto bg-white border-x border-gray-100">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                            m.role === 'user' 
                              ? 'bg-blue-600 text-white rounded-br-none' 
                              : 'bg-gray-100 text-gray-800 rounded-bl-none'
                        }`}>
                            {m.text}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 p-3 rounded-2xl rounded-bl-none flex gap-1">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>
            <div className="p-4 border-t border-gray-100 bg-white">
                <div className="flex gap-2 items-center bg-gray-50 border border-gray-200 rounded-full px-4 py-2">
                    <input 
                        className="flex-1 bg-transparent focus:outline-none text-sm"
                        placeholder="Type your answer..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                    />
                    <button onClick={handleSend} disabled={loading || !input.trim()} className="text-blue-600 disabled:text-gray-300">
                        <SendIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
  };

  const MultipleChoiceMode = () => {
    const [selectedSet, setSelectedSet] = useState<VocabSet | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<{word: WordItem, options: string[]} | null>(null);
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

    // Helper to shuffle array
    const shuffle = (array: any[]) => array.sort(() => Math.random() - 0.5);

    const generateQuestion = (set: VocabSet) => {
        if (set.words.length < 4) {
             alert("Need at least 4 words in a set for multiple choice.");
             setSelectedSet(null);
             return;
        }
        const targetWord = set.words[Math.floor(Math.random() * set.words.length)];
        const others = set.words.filter(w => w.id !== targetWord.id);
        const distractors = shuffle(others).slice(0, 3).map(w => w.definition);
        const options = shuffle([targetWord.definition, ...distractors]);
        
        setCurrentQuestion({ word: targetWord, options });
        setFeedback(null);
    };

    const handleAnswer = (option: string) => {
        if (!currentQuestion) return;
        if (option === currentQuestion.word.definition) {
            setFeedback('correct');
        } else {
            setFeedback('incorrect');
        }
        setTimeout(() => {
            if (selectedSet) generateQuestion(selectedSet);
        }, 1500);
    };

    if (!currentUser) return null;

    if (!selectedSet) {
        return (
            <div className="max-w-md mx-auto p-4">
              <h3 className="text-lg font-bold mb-4">Select Set for Quiz</h3>
              <div className="space-y-3">
                {currentUser.vocabSets.map(set => (
                  <button
                    key={set.id}
                    onClick={() => { setSelectedSet(set); generateQuestion(set); }}
                    className="w-full text-left bg-white p-4 rounded-xl shadow-sm border hover:border-emerald-400 transition"
                  >
                    <span className="font-bold">{set.name}</span>
                    <span className="float-right text-sm text-gray-500">{set.words.length} words</span>
                  </button>
                ))}
              </div>
            </div>
        );
    }

    if (!currentQuestion) return null;

    return (
        <div className="max-w-md mx-auto p-4 flex flex-col items-center justify-center min-h-[80vh]">
            <div className="w-full bg-white p-8 rounded-3xl shadow-lg text-center mb-8 border border-emerald-100 relative overflow-hidden">
                {feedback && (
                    <div className={`absolute inset-0 flex items-center justify-center bg-opacity-90 backdrop-blur-sm transition ${feedback === 'correct' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                        {feedback === 'correct' 
                          ? <CheckCircleIcon className="w-16 h-16 text-emerald-600 animate-bounce" /> 
                          : <XCircleIcon className="w-16 h-16 text-red-600 animate-pulse" />
                        }
                    </div>
                )}
                <h2 className="text-gray-500 text-sm uppercase tracking-widest mb-2">Identify the meaning</h2>
                <h1 className="text-3xl font-bold text-gray-800">{currentQuestion.word.word}</h1>
            </div>

            <div className="grid grid-cols-1 gap-3 w-full">
                {currentQuestion.options.map((opt, i) => (
                    <button 
                        key={i}
                        onClick={() => handleAnswer(opt)}
                        disabled={!!feedback}
                        className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-blue-50 hover:border-blue-300 text-left transition text-gray-700 font-medium"
                    >
                        {opt}
                    </button>
                ))}
            </div>
            <button onClick={() => setSelectedSet(null)} className="mt-8 text-gray-400 text-sm hover:text-gray-600">Stop Quiz</button>
        </div>
    );
  };

  // --- Render Router ---

  const renderContent = () => {
    switch (currentScreen) {
      case 'LOGIN': return <LoginScreen />;
      case 'REGISTER': return <LoginScreen />; // LoginScreen handles both
      case 'MAIN': return <MainMenu />;
      case 'SAVE_VOCAB': return <VocabManager />;
      case 'EDIT_SET': return <SetEditor />;
      case 'PRACTICE_MENU': return <PracticeMenu />;
      case 'PRACTICE_FLASHCARD': return <FlashcardMode />;
      case 'PRACTICE_1VS1': return <Chat1vs1Mode />;
      case 'PRACTICE_MULTIPLE_CHOICE': return <MultipleChoiceMode />;
      default: return <MainMenu />;
    }
  };

  return (
    <div className="min-h-screen pb-safe">
      <Navbar />
      <div className="animate-fade-in">
        {renderContent()}
      </div>
      <ProfileModal />
    </div>
  );
};

export default App;