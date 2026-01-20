import { useState, useEffect } from 'react';
import { Brain, Check, X, ChevronRight, RotateCcw, Trophy, ArrowLeft, Clock, Sliders, HelpCircle } from 'lucide-react';
import type { WordList, QuizType, QuizQuestion, Word } from '../types';

interface ListWordCount {
    [listId: number]: { total: number; due: number };
}

// Graduation threshold - need this many consecutive correct answers to graduate
const GRADUATION_THRESHOLD = 2;

// Learning state for each word in the session
interface WordProgress {
    question: QuizQuestion;
    state: 'new' | 'learning' | 'graduated';
    attempts: number;
    consecutiveCorrect: number; // Track consecutive correct answers
    lastGrade: number; // 1 = didn't know, 2 = not sure, 3 = knew it
}

function Quiz() {
    const [wordLists, setWordLists] = useState<WordList[]>([]);
    const [selectedList, setSelectedList] = useState<WordList | null>(null);
    const [quizType, setQuizType] = useState<QuizType>('flashcard');
    const [isQuizActive, setIsQuizActive] = useState(false);
    const [loading, setLoading] = useState(true);
    const [quizSize, setQuizSize] = useState(10);
    const [listWordCounts, setListWordCounts] = useState<ListWordCount>({});
    const [isReviewMode, setIsReviewMode] = useState(false);

    // Learning queue system
    const [learningQueue, setLearningQueue] = useState<WordProgress[]>([]);
    const [graduatedWords, setGraduatedWords] = useState<WordProgress[]>([]);
    const [totalWordsInSession, setTotalWordsInSession] = useState(0);
    const [firstAttemptCorrect, setFirstAttemptCorrect] = useState(0); // Track first-attempt accuracy
    const [showAnswer, setShowAnswer] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isComplete, setIsComplete] = useState(false);
    const [allWords, setAllWords] = useState<Word[]>([]);

    useEffect(() => {
        loadWordLists();
    }, []);

    // Quiz completion detection - watch for empty learning queue
    useEffect(() => {
        const completeQuiz = async () => {
            if (isQuizActive && !isComplete && learningQueue.length === 0 && graduatedWords.length > 0) {
                setIsComplete(true);
                if (selectedList) {
                    // Save first-attempt accuracy as score (how many correct on first try)
                    await window.electronAPI.saveQuizResult(
                        selectedList.id,
                        firstAttemptCorrect,
                        totalWordsInSession,
                        quizType
                    );
                    // Refresh word lists to update due counts
                    await loadWordLists();
                }
            }
        };
        completeQuiz();
    }, [learningQueue, graduatedWords, isQuizActive, isComplete, selectedList, totalWordsInSession, quizType, firstAttemptCorrect]);

    const loadWordLists = async () => {
        setLoading(true);
        try {
            const lists = await window.electronAPI.getWordLists();
            setWordLists(lists);

            // Fetch word counts and due-for-review counts for each list
            const counts: ListWordCount = {};
            const allDueWords = await window.electronAPI.getWordsDueForReview();
            const dueWordSet = new Set(allDueWords.map(w => w.word_lower));

            for (const list of lists) {
                const words = await window.electronAPI.getWordsInList(list.id);
                const dueCount = words.filter(w =>
                    dueWordSet.has(w.word.toLowerCase().replace(/[^a-zA-Zğüşıöçéèêëàâäùûüîïôöÿçñ\s]/gi, '').toLowerCase())
                ).length;
                counts[list.id] = { total: words.length, due: dueCount };
            }
            setListWordCounts(counts);
        } catch (error) {
            console.error('Failed to load word lists:', error);
        } finally {
            setLoading(false);
        }
    };

    const startQuiz = async (reviewOnly: boolean = false) => {
        if (!selectedList) return;

        try {
            const words = await window.electronAPI.getWordsInList(selectedList.id);
            setAllWords(words);

            // For review mode, filter to only due words
            let quizWords = words;
            if (reviewOnly) {
                const allDueWords = await window.electronAPI.getWordsDueForReview();
                const dueWordSet = new Set(allDueWords.map(w => w.word_lower));
                quizWords = words.filter(w =>
                    dueWordSet.has(w.word.toLowerCase().replace(/[^a-zA-Zğüşıöçéèêëàâäùûüîïôöÿçñ\s]/gi, '').toLowerCase())
                );
            }

            if (quizWords.length < 1) {
                alert(reviewOnly
                    ? 'No words due for review in this list.'
                    : 'You need at least 1 word in a list to start a quiz.');
                return;
            }

            // Shuffle and limit to quizSize
            const shuffled = [...quizWords].sort(() => Math.random() - 0.5);
            const limited = shuffled.slice(0, Math.min(quizSize, shuffled.length));

            // Create learning queue with WordProgress entries
            const queue: WordProgress[] = limited.map(word => {
                const otherWords = words.filter(w => w.id !== word.id);
                const shuffledOthers = otherWords.sort(() => Math.random() - 0.5).slice(0, 3);

                const options = quizType === 'reverse'
                    ? [word.word, ...shuffledOthers.map(w => w.word)]
                    : [word.translation, ...shuffledOthers.map(w => w.translation)];

                return {
                    question: {
                        word,
                        options: options.sort(() => Math.random() - 0.5),
                        correctAnswer: quizType === 'reverse' ? word.word : word.translation,
                    },
                    state: 'new' as const,
                    attempts: 0,
                    consecutiveCorrect: 0,
                    lastGrade: 0,
                };
            });

            setLearningQueue(queue);
            setGraduatedWords([]);
            setTotalWordsInSession(queue.length);
            setShowAnswer(false);
            setSelectedAnswer(null);
            setIsComplete(false);
            setIsReviewMode(reviewOnly);
            setIsQuizActive(true);
        } catch (error) {
            console.error('Failed to start quiz:', error);
        }
    };

    // Handle grade selection for flashcard mode (3-tier: 1=didn't know, 2=not sure, 3=knew it)
    const handleFlashcardGrade = async (grade: number) => {
        if (learningQueue.length === 0) return;

        const currentWord = learningQueue[0];

        // Track first-attempt accuracy: count if correct (grade 3) on first try (attempts === 0)
        if (currentWord.attempts === 0 && grade === 3) {
            setFirstAttemptCorrect(prev => prev + 1);
        }

        // Update SRS based on grade
        await updateWordWithSRS(currentWord.question.word.word, grade);

        if (grade === 3) {
            // Knew it - increase consecutive correct count
            const newConsecutive = currentWord.consecutiveCorrect + 1;

            if (newConsecutive >= GRADUATION_THRESHOLD) {
                // Reached threshold - graduate the word
                setGraduatedWords(prev => [...prev, {
                    ...currentWord,
                    state: 'graduated',
                    lastGrade: grade,
                    attempts: currentWord.attempts + 1,
                    consecutiveCorrect: newConsecutive
                }]);
                setLearningQueue(prev => prev.slice(1));
            } else {
                // Not enough consecutive - re-queue to confirm later
                const updatedWord: WordProgress = {
                    ...currentWord,
                    state: 'learning',
                    attempts: currentWord.attempts + 1,
                    consecutiveCorrect: newConsecutive,
                    lastGrade: grade,
                };
                setLearningQueue(prev => [...prev.slice(1), updatedWord]);
            }
        } else {
            // Didn't know (1) or Not sure (2) - reset consecutive counter and re-queue
            const updatedWord: WordProgress = {
                ...currentWord,
                state: 'learning',
                attempts: currentWord.attempts + 1,
                consecutiveCorrect: 0, // Reset on wrong/uncertain
                lastGrade: grade,
            };
            setLearningQueue(prev => [...prev.slice(1), updatedWord]);
        }

        setShowAnswer(false);
        setSelectedAnswer(null);
        // Completion is now detected via useEffect watching learningQueue
    };

    // Handle answer for multiple choice / reverse modes
    const handleAnswer = async (answer: string) => {
        if (learningQueue.length === 0) return;

        const currentWord = learningQueue[0];
        const isCorrect = answer === currentWord.question.correctAnswer;

        setSelectedAnswer(answer);
        setShowAnswer(true);

        // Grade: correct = 3 (knew it), incorrect = 1 (didn't know)
        const grade = isCorrect ? 3 : 1;
        await updateWordWithSRS(currentWord.question.word.word, grade);

        // Store the grade for processing in nextQuestion
        currentWord.lastGrade = grade;
    };

    // Move to next question after showing answer
    const nextQuestion = () => {
        if (learningQueue.length === 0) return;

        const currentWord = learningQueue[0];

        if (currentWord.lastGrade === 3) {
            // Correct - increase consecutive count
            const newConsecutive = currentWord.consecutiveCorrect + 1;

            if (newConsecutive >= GRADUATION_THRESHOLD) {
                // Graduate
                setGraduatedWords(prev => [...prev, {
                    ...currentWord,
                    state: 'graduated',
                    attempts: currentWord.attempts + 1,
                    consecutiveCorrect: newConsecutive
                }]);
                setLearningQueue(prev => prev.slice(1));
            } else {
                // Re-queue to confirm
                const updatedWord: WordProgress = {
                    ...currentWord,
                    state: 'learning',
                    attempts: currentWord.attempts + 1,
                    consecutiveCorrect: newConsecutive,
                };
                setLearningQueue(prev => [...prev.slice(1), updatedWord]);
            }
        } else {
            // Incorrect - reset and re-queue
            const updatedWord: WordProgress = {
                ...currentWord,
                state: 'learning',
                attempts: currentWord.attempts + 1,
                consecutiveCorrect: 0,
            };
            setLearningQueue(prev => [...prev.slice(1), updatedWord]);
        }

        setShowAnswer(false);
        setSelectedAnswer(null);

    };



    // Update word with SRS algorithm - grade: 1 = didn't know, 2 = not sure, 3 = knew it
    const updateWordWithSRS = async (word: string, grade: number) => {
        try {
            const wordLower = word.toLowerCase().replace(/[^a-zA-Zğüşıöçéèêëàâäùûüîïôöÿçñ]/gi, '');
            const familiarity = await window.electronAPI.getWordFamiliarity(wordLower);

            if (familiarity) {
                let newEF = familiarity.easiness_factor;
                let newInterval: number;
                let newRepetitions: number;

                if (grade === 1) {
                    // Didn't know - reset and decrease EF
                    newRepetitions = 0;
                    newInterval = 1;
                    newEF = Math.max(1.3, familiarity.easiness_factor - 0.2);
                } else if (grade === 2) {
                    // Not sure - short interval, maintain EF
                    newRepetitions = 0;
                    newInterval = 1;
                    // EF stays the same
                } else {
                    // Knew it - success, increase EF
                    newRepetitions = familiarity.repetitions + 1;
                    newEF = Math.min(2.5, familiarity.easiness_factor + 0.1);

                    if (newRepetitions === 1) {
                        newInterval = 1;
                    } else if (newRepetitions === 2) {
                        newInterval = 6;
                    } else {
                        newInterval = Math.ceil(familiarity.interval * newEF);
                    }
                }

                // Calculate next review date
                const nextReview = new Date();
                nextReview.setDate(nextReview.getDate() + newInterval);

                // Calculate familiarity level from EF
                let familiarityLevel: number;
                if (newEF < 1.7) familiarityLevel = 1;
                else if (newEF < 2.0) familiarityLevel = 2;
                else if (newEF < 2.3) familiarityLevel = 3;
                else if (newEF < 2.6) familiarityLevel = 4;
                else familiarityLevel = 5;

                // Update in database
                await window.electronAPI.updateWordSRS(
                    wordLower,
                    newEF,
                    newInterval,
                    newRepetitions,
                    nextReview.toISOString(),
                    familiarityLevel
                );
            }
        } catch (error) {
            console.error('Failed to update SRS:', error);
        }
    };

    const resetQuiz = async () => {
        setIsQuizActive(false);
        setIsComplete(false);
        setSelectedList(null);
        setLearningQueue([]);
        setGraduatedWords([]);
        setFirstAttemptCorrect(0); // Reset first-attempt counter
        // Refresh word lists to update due counts
        await loadWordLists();
    };

    // Current word from queue
    const currentWord = learningQueue.length > 0 ? learningQueue[0] : null;
    const currentQuestion = currentWord?.question;

    // Quiz selection screen
    if (!isQuizActive) {
        const maxQuizSize = selectedList ? (listWordCounts[selectedList.id]?.total || 10) : 10;

        return (
            <div className="h-full p-4 sm:p-6 lg:p-8 overflow-auto" style={{ background: 'var(--bg-primary)' }}>
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8" style={{ color: 'var(--accent)' }}>
                        Quiz Mode
                    </h1>

                    {/* Quiz Type Selection */}
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">Select Quiz Type</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { type: 'flashcard' as QuizType, label: 'Flashcards', description: 'See word, recall translation' },
                                { type: 'multiple-choice' as QuizType, label: 'Multiple Choice', description: 'Choose correct translation' },
                                { type: 'reverse' as QuizType, label: 'Reverse', description: 'See translation, guess word' },
                            ].map(({ type, label, description }) => (
                                <button
                                    key={type}
                                    onClick={() => setQuizType(type)}
                                    className={`card text-left transition-all duration-200 ${quizType === type
                                        ? 'bg-gradient-to-r from-primary-500/30 to-accent-500/30 border-2 border-primary-500 ring-2 ring-primary-500/30'
                                        : 'border border-white/10 hover:border-primary-500/50 hover:bg-primary-500/10'
                                        }`}
                                >
                                    <h3 className={`font-semibold mb-1 ${quizType === type ? 'text-primary-300' : ''}`}>{label}</h3>
                                    <p className="text-sm text-dark-400">{description}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quiz Size Control */}
                    <div className="mb-8 card bg-dark-800/50">
                        <div className="flex items-center gap-4">
                            <Sliders size={20} className="text-primary-400" />
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium">Quiz Size</span>
                                    <span className="text-lg font-bold text-primary-400">{quizSize} words</span>
                                </div>
                                <input
                                    type="range"
                                    min={4}
                                    max={Math.max(4, maxQuizSize)}
                                    value={Math.min(quizSize, maxQuizSize)}
                                    onChange={(e) => setQuizSize(parseInt(e.target.value))}
                                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                    style={{ background: 'var(--bg-tertiary)' }}
                                />
                                <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                    <span>4</span>
                                    <span>{maxQuizSize}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Word List Selection */}
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Select Word List</h2>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
                            </div>
                        ) : wordLists.length === 0 ? (
                            <div className="card text-center py-12">
                                <Brain size={48} className="mx-auto mb-4 text-dark-400 opacity-50" />
                                <p className="text-dark-400">No word lists available</p>
                                <p className="text-sm text-dark-500">Create a list and add words first!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {wordLists.map(list => {
                                    const counts = listWordCounts[list.id] || { total: 0, due: 0 };
                                    const isSelected = selectedList?.id === list.id;

                                    return (
                                        <div
                                            key={list.id}
                                            className={`card transition-all duration-200 ${isSelected
                                                ? 'bg-gradient-to-r from-primary-500/30 to-accent-500/30 border-2 border-primary-500 ring-2 ring-primary-500/30'
                                                : 'border border-white/10 hover:border-primary-500/50'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <button
                                                    onClick={() => setSelectedList(list)}
                                                    className="flex-1 text-left"
                                                >
                                                    <h3 className={`font-semibold ${isSelected ? 'text-primary-300' : ''}`}>{list.name}</h3>
                                                    <p className="text-sm text-dark-400">
                                                        {counts.total} words
                                                        {list.description && ` • ${list.description}`}
                                                    </p>
                                                </button>
                                                {isSelected && (
                                                    <Check size={20} className="text-primary-400" />
                                                )}
                                            </div>

                                            {/* Review button for this list */}
                                            {counts.due > 0 && (
                                                <button
                                                    onClick={() => { setSelectedList(list); setTimeout(() => startQuiz(true), 50); }}
                                                    className="w-full mt-2 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-sm font-medium transition-colors"
                                                >
                                                    <Clock size={16} />
                                                    Review {counts.due} due words
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Start Button */}
                    <div className="mt-8 flex justify-center gap-4">
                        <button
                            onClick={() => startQuiz(false)}
                            disabled={!selectedList}
                            className="btn-primary px-8 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Brain className="inline mr-2" size={20} />
                            Start Quiz
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Quiz complete screen
    if (isComplete) {
        const percentage = totalWordsInSession > 0 ? Math.round((graduatedWords.length / totalWordsInSession) * 100) : 0;
        const totalAttempts = graduatedWords.reduce((sum, w) => sum + w.attempts, 0);

        return (
            <div className="h-full flex items-center justify-center p-8">
                <div className="card text-center max-w-md animate-scale-in">
                    <div className="p-6 rounded-full bg-gradient-to-br from-primary-500/20 to-accent-500/20 inline-block mb-6">
                        <Trophy size={64} className="text-yellow-400" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Quiz Complete!</h1>
                    <p className="text-6xl font-bold gradient-text my-6">{percentage}%</p>
                    <p className="text-xl text-dark-300 mb-4">
                        All {totalWordsInSession} words mastered!
                    </p>
                    <p className="text-sm text-dark-400 mb-8">
                        Total attempts: {totalAttempts} (avg {(totalAttempts / totalWordsInSession).toFixed(1)} per word)
                    </p>
                    <div className="flex gap-4">
                        <button onClick={resetQuiz} className="btn-secondary flex-1">
                            <ArrowLeft size={18} className="inline mr-2" />
                            Back
                        </button>
                        <button onClick={() => startQuiz(isReviewMode)} className="btn-primary flex-1">
                            <RotateCcw size={18} className="inline mr-2" />
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // No current question (shouldn't happen)
    if (!currentQuestion) {
        return <div>Loading...</div>;
    }

    // Active quiz screen
    const progressPercent = totalWordsInSession > 0
        ? ((graduatedWords.length / totalWordsInSession) * 100)
        : 0;

    return (
        <div className="h-full flex flex-col p-8">
            {/* Progress */}
            <div className="max-w-2xl mx-auto w-full mb-8">
                <div className="flex items-center justify-between mb-2">
                    <button onClick={resetQuiz} className="text-dark-400 hover:text-white transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <span className="text-sm text-dark-400">
                        {graduatedWords.length} / {totalWordsInSession} words mastered
                        {learningQueue.length > 1 && ` (${learningQueue.length - 1} in queue)`}
                    </span>
                    <span className="text-sm font-medium text-primary-400">
                        {currentWord?.attempts > 0 && `Attempt ${currentWord.attempts + 1}`}
                    </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                    <div
                        className="h-full transition-all duration-300"
                        style={{ width: `${progressPercent}%`, background: 'var(--accent)' }}
                    />
                </div>
            </div>

            {/* Question Card */}
            <div className="flex-1 flex items-center justify-center">
                <div className="card max-w-2xl w-full animate-fade-in">
                    {quizType === 'flashcard' ? (
                        // Flashcard mode with 3-tier responses
                        <div className="text-center py-8">
                            <p className="text-sm text-dark-400 uppercase tracking-wide mb-4">
                                {showAnswer ? 'Translation' : 'Word'}
                            </p>
                            <p className="text-4xl font-bold mb-8">
                                {showAnswer ? currentQuestion.word.translation : currentQuestion.word.word}
                            </p>

                            {!showAnswer ? (
                                <button
                                    onClick={() => setShowAnswer(true)}
                                    className="btn-primary px-8 py-3"
                                >
                                    Show Answer
                                </button>
                            ) : (
                                <div className="flex justify-center gap-3">
                                    <button
                                        onClick={() => handleFlashcardGrade(1)}
                                        className="flex-1 max-w-[140px] py-3 px-4 rounded-lg transition-all font-medium"
                                        style={{ background: '#dc2626', color: 'white' }}
                                    >
                                        <X size={20} className="inline mr-2" />
                                        Didn't know
                                    </button>
                                    <button
                                        onClick={() => handleFlashcardGrade(2)}
                                        className="flex-1 max-w-[140px] py-3 px-4 rounded-lg transition-all font-medium"
                                        style={{ background: '#d97706', color: 'white' }}
                                    >
                                        <HelpCircle size={20} className="inline mr-2" />
                                        Not sure
                                    </button>
                                    <button
                                        onClick={() => handleFlashcardGrade(3)}
                                        className="flex-1 max-w-[140px] py-3 px-4 rounded-lg transition-all font-medium"
                                        style={{ background: '#16a34a', color: 'white' }}
                                    >
                                        <Check size={20} className="inline mr-2" />
                                        I knew it
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Multiple choice / Reverse mode
                        <div className="py-4">
                            <p className="text-sm text-dark-400 uppercase tracking-wide mb-2 text-center">
                                {quizType === 'reverse' ? 'Translation' : 'Word'}
                            </p>
                            <p className="text-3xl font-bold text-center mb-8">
                                {quizType === 'reverse' ? currentQuestion.word.translation : currentQuestion.word.word}
                            </p>

                            <div className="grid grid-cols-1 gap-3">
                                {currentQuestion.options?.map((option: string, index: number) => {
                                    const isCorrect = option === currentQuestion.correctAnswer;
                                    const isSelected = option === selectedAnswer;

                                    let buttonClass = 'w-full p-4 rounded-lg text-left transition-all duration-200 ';

                                    if (showAnswer) {
                                        if (isCorrect) {
                                            buttonClass += 'bg-green-500/30 border-2 border-green-500 text-green-200 ring-2 ring-green-500/20';
                                        } else if (isSelected && !isCorrect) {
                                            buttonClass += 'bg-red-500/30 border-2 border-red-500 text-red-200 ring-2 ring-red-500/20';
                                        } else {
                                            buttonClass += 'glass opacity-40 border border-transparent';
                                        }
                                    } else {
                                        buttonClass += 'glass glass-hover border border-white/10 hover:border-primary-500/50 hover:bg-primary-500/10 active:scale-[0.99]';
                                    }

                                    return (
                                        <button
                                            key={index}
                                            onClick={() => !showAnswer && handleAnswer(option)}
                                            disabled={showAnswer}
                                            className={buttonClass}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${showAnswer && isCorrect ? 'bg-green-500 text-white' :
                                                    showAnswer && isSelected && !isCorrect ? 'bg-red-500 text-white' :
                                                        'bg-dark-700'
                                                    }`}>
                                                    {String.fromCharCode(65 + index)}
                                                </span>
                                                <span className="flex-1 font-medium">{option}</span>
                                                {showAnswer && isCorrect && (
                                                    <Check size={20} className="text-green-400 animate-scale-in" />
                                                )}
                                                {showAnswer && isSelected && !isCorrect && (
                                                    <X size={20} className="text-red-400 animate-scale-in" />
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {showAnswer && (
                                <button
                                    onClick={nextQuestion}
                                    className="btn-primary w-full mt-6 py-3"
                                >
                                    {selectedAnswer === currentQuestion.correctAnswer ? 'Continue' : 'Try this word again later'}
                                    <ChevronRight size={18} className="inline ml-2" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Quiz;
