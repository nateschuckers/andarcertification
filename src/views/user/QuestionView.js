import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { db } from '../../firebase/config';
import { collection, onSnapshot, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { shuffleArray } from '../../utils/helpers';
import AnswerFeedbackModal from '../../components/AnswerFeedbackModal';
import ConfirmExitModal from '../../components/ConfirmExitModal';
import CompletionScreen from '../../components/CompletionScreen'; // Import the new component

const PASS_RATE = 0.8; // 80%

const QuestionView = ({ course, user, onBack }) => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [quizQuestions, setQuizQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const hasConfirmedExit = useRef(false);

    // New state for scoring and completion
    const [userAnswers, setUserAnswers] = useState([]);
    const [quizStartTime, setQuizStartTime] = useState(null);
    const [showCompletionScreen, setShowCompletionScreen] = useState(false);
    const [finalScore, setFinalScore] = useState(0);

    const resetQuiz = useCallback(() => {
        // Shuffle and prepare questions for a new attempt
        const shuffledPool = shuffleArray(questions);
        const quizLength = course.quizLength || shuffledPool.length;
        const selectedQuestions = shuffledPool.slice(0, quizLength);
        const processedQuestions = selectedQuestions.map(q => {
            const correctAnswerText = q.options[q.correctAnswer];
            const shuffledOptions = shuffleArray(q.options);
            const newCorrectAnswerIndex = shuffledOptions.indexOf(correctAnswerText);
            return { ...q, options: shuffledOptions, correctAnswer: newCorrectAnswerIndex };
        });
        setQuizQuestions(processedQuestions);
        
        // Reset state for the new attempt
        setCurrentQuestionIndex(0);
        setSelectedAnswer(null);
        setUserAnswers([]);
        setShowCompletionScreen(false);
        setFinalScore(0);
        setQuizStartTime(Date.now()); // Start the timer

    }, [questions, course.quizLength]);


    // Effect to fetch questions from Firestore
    useEffect(() => {
        const q = collection(db, `courses/${course.id}/questions`);
        const unsub = onSnapshot(q, (snapshot) => {
            const fetchedQuestions = [];
            snapshot.forEach(doc => fetchedQuestions.push({ id: doc.id, ...doc.data() }));
            setQuestions(fetchedQuestions);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching questions:", error);
            setLoading(false);
        });
        return () => unsub();
    }, [course.id]);
    
    // Effect to start the quiz once questions are loaded
    useEffect(() => {
        if (questions.length > 0) {
            resetQuiz(); // Initial setup of the quiz

            // Record the attempt in Firestore
            const recordAttempt = async () => {
                const userCourseRef = doc(db, `users/${user.id}/userCourseData`, course.id);
                const activityLogRef = doc(db, 'activityLogs', user.id);
                try {
                    await runTransaction(db, async (transaction) => {
                        const activityLogDoc = await transaction.get(activityLogRef);
                        const userCourseDoc = await transaction.get(userCourseRef);
                        
                        if (!activityLogDoc.exists()) {
                            transaction.set(activityLogRef, { attempts: 1 });
                        } else {
                            const newAttempts = (activityLogDoc.data().attempts || 0) + 1;
                            transaction.update(activityLogRef, { attempts: newAttempts });
                        }

                        if (userCourseDoc.exists()) {
                             const newAttemptCount = (userCourseDoc.data().attemptCount || 0) + 1;
                             transaction.update(userCourseRef, { attemptCount: newAttemptCount });
                        }
                    });
                } catch (e) {
                    console.error("Transaction failed: ", e);
                }
            };
            recordAttempt();
        }
    }, [questions, course.id, user.id, resetQuiz]);

    // Handle back button presses for exit confirmation
    useEffect(() => {
        window.history.pushState(null, '');
        const handlePopState = () => {
            if (!hasConfirmedExit.current && !showCompletionScreen) {
                setShowExitConfirm(true);
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [showCompletionScreen]);

    const handleBackButtonClick = () => {
        setShowExitConfirm(true);
    };

    const handleConfirmExit = () => {
        hasConfirmedExit.current = true;
        onBack();
    };

    const handleCancelExit = () => {
        window.history.pushState(null, '');
        setShowExitConfirm(false);
    };

    const currentQuestion = quizQuestions[currentQuestionIndex];
    const isCorrect = selectedAnswer !== null && selectedAnswer === currentQuestion?.correctAnswer;

    const handleAnswerClick = (index) => {
        if (selectedAnswer !== null) return;
        const isAnswerCorrect = index === currentQuestion.correctAnswer;
        setUserAnswers([...userAnswers, { questionId: currentQuestion.id, isCorrect: isAnswerCorrect }]);
        setSelectedAnswer(index);
    };

    const handleNextQuestion = async () => {
        if (currentQuestionIndex < quizQuestions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswer(null);
        } else {
            // End of quiz logic
            const quizEndTime = Date.now();
            const trainingDuration = Math.round((quizEndTime - quizStartTime) / 1000); // in seconds
            const score = userAnswers.filter(a => a.isCorrect).length;
            const hasPassed = (score / quizQuestions.length) >= PASS_RATE;

            setFinalScore(score);
            setShowCompletionScreen(true);

            // Save results to Firestore
            const userCourseRef = doc(db, `users/${user.id}/userCourseData`, course.id);
            const activityLogRef = doc(db, 'activityLogs', user.id);
            
            try {
                await runTransaction(db, async (transaction) => {
                    const activityLogDoc = await transaction.get(activityLogRef);
                    const userCourseDoc = await transaction.get(userCourseRef);
                    
                    // Update Activity Log
                    const newTotalTime = (activityLogDoc.data()?.totalTrainingTime || 0) + trainingDuration;
                    const newPasses = (activityLogDoc.data()?.passes || 0) + (hasPassed ? 1 : 0);
                    const newFails = (activityLogDoc.data()?.fails || 0) + (hasPassed ? 0 : 1);
                    const totalAttempts = activityLogDoc.data()?.attempts || 1;
                    const newPassRate = Math.round((newPasses / totalAttempts) * 100);

                    transaction.update(activityLogRef, {
                        totalTrainingTime: newTotalTime,
                        passes: newPasses,
                        fails: newFails,
                        passRate: newPassRate,
                    });
                    
                    // Update User Course Data
                    const newFailCount = (userCourseDoc.data()?.failCount || 0) + (hasPassed ? 0 : 1);
                    const updateData = {
                        status: hasPassed ? 'completed' : 'failed',
                        completedDate: hasPassed ? serverTimestamp() : null,
                        failCount: newFailCount,
                    };
                    transaction.update(userCourseRef, updateData);
                });
            } catch (e) {
                console.error("Failed to save quiz results:", e);
            }
        }
    };
    
    if (loading) {
        return <div className="p-8 text-center text-neutral-800 dark:text-white">Loading Questions...</div>;
    }
    
    if (showCompletionScreen) {
        return <CompletionScreen score={finalScore} totalQuestions={quizQuestions.length} onBack={onBack} onRetry={resetQuiz} />;
    }

    if (quizQuestions.length === 0) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl text-neutral-800 dark:text-white">This course has no questions yet.</h2>
                <button onClick={onBack} className="mt-4 btn-secondary text-white font-bold py-2 px-4 rounded">Back to Courses</button>
            </div>
        )
    }
    
    if (!currentQuestion) return null; // Should not happen if loading is false and quizQuestions exist

    const getButtonClass = (index) => {
        let baseClass = "w-full text-left p-4 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-md hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/20 dark:hover:shadow-blue-400/20 transition-all duration-300 ease-in-out text-neutral-800 dark:text-neutral-200";
        if (selectedAnswer === null) return baseClass;
        if (index === currentQuestion.correctAnswer) return `${baseClass} bg-green-100 dark:bg-green-900/50 border-green-500`;
        if (index === selectedAnswer && selectedAnswer !== currentQuestion.correctAnswer) return `${baseClass} bg-red-100 dark:bg-red-900/50 border-red-500`;
        return `${baseClass} opacity-60`;
    };

    return (
        <div className="relative">
            {showExitConfirm && <ConfirmExitModal onConfirm={handleConfirmExit} onCancel={handleCancelExit} />}
            {selectedAnswer !== null && <AnswerFeedbackModal isCorrect={isCorrect} onNext={handleNextQuestion} />}

            <div className={`p-8 max-w-4xl mx-auto ${showExitConfirm || selectedAnswer !== null ? 'blur-sm' : ''}`}>
                <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-8 shadow-inner dark:shadow-neutral-950">
                    <h2 className="text-3xl font-bold mb-4 text-neutral-900 dark:text-white">{course.title}</h2>
                    <div className="text-center mb-4 p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-md text-sm font-semibold">
                        A score of {PASS_RATE * 100}% is required to pass.
                    </div>
                    <div className="flex justify-between items-center border-t border-b border-neutral-300 dark:border-neutral-700 py-3 mb-8 text-sm">
                        <button onClick={handleBackButtonClick} className="text-neutral-600 dark:text-neutral-400 hover:text-blue-500 font-semibold">&larr; Back to Courses</button>
                        <span className="text-neutral-500 dark:text-neutral-400">Participant: <span className="font-semibold text-neutral-700 dark:text-neutral-200">{user.name}</span></span>
                        <span className="font-bold text-neutral-700 dark:text-neutral-200">Question {currentQuestionIndex + 1} of {quizQuestions.length}</span>
                    </div>
                    <div>
                        <p className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-6">{currentQuestion.text}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentQuestion.options.map((option, index) => (
                                <button key={index} onClick={() => handleAnswerClick(index)} disabled={selectedAnswer !== null} className={getButtonClass(index)}>
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

QuestionView.propTypes = {
    course: PropTypes.object.isRequired,
    user: PropTypes.object.isRequired,
    onBack: PropTypes.func.isRequired,
};

export default QuestionView;

