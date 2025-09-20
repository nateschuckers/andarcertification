import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { shuffleArray } from '../../utils/helpers';
import ConfirmExitModal from '../../components/ConfirmExitModal';
import AnswerFeedbackModal from '../../components/AnswerFeedbackModal';

const QuestionView = ({ course, user, onBack }) => {
    const [quizQuestions, setQuizQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const hasConfirmedExit = useRef(false);

    useEffect(() => {
        const q = query(collection(db, `courses/${course.id}/questions`));
        const unsub = onSnapshot(q, (snapshot) => {
            const fetchedQuestions = [];
            snapshot.forEach(doc => fetchedQuestions.push({ id: doc.id, ...doc.data() }));
            
            const shuffledPool = shuffleArray(fetchedQuestions);
            const quizLength = course.quizLength || shuffledPool.length;
            const selectedQuestions = shuffledPool.slice(0, quizLength);
            
            const processedQuestions = selectedQuestions.map(q => {
                const correctAnswerText = q.options[q.correctAnswer];
                const shuffledOptions = shuffleArray(q.options);
                const newCorrectAnswerIndex = shuffledOptions.indexOf(correctAnswerText);
                return { ...q, options: shuffledOptions, correctAnswer: newCorrectAnswerIndex };
            });

            setQuizQuestions(processedQuestions);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching questions: ", err);
            setLoading(false);
        });
        return () => unsub();
    }, [course.id, course.quizLength]);
    
    // Browser back button handling
    useEffect(() => {
        window.history.pushState(null, '');
        const handlePopState = (e) => {
            // Prevent default back navigation and show confirmation
            e.preventDefault();
            if (!hasConfirmedExit.current) {
                setShowExitConfirm(true);
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const handleBackButtonClick = () => {
        setShowExitConfirm(true);
    };

    const handleConfirmExit = () => {
        hasConfirmedExit.current = true;
        onBack();
    };

    const handleCancelExit = () => {
        // Pushing a new state to "reset" the back button behavior
        window.history.pushState(null, '');
        setShowExitConfirm(false);
    };

    const currentQuestion = quizQuestions[currentQuestionIndex];
    const isCorrect = selectedAnswer !== null && selectedAnswer === currentQuestion?.correctAnswer;

    const handleAnswerClick = (index) => {
        if (selectedAnswer !== null) return; 
        setSelectedAnswer(index);
        // In a real app, you would record the attempt (correct/incorrect) in Firestore here.
    };

    const handleNextQuestion = () => {
         setSelectedAnswer(null);
         if (currentQuestionIndex < quizQuestions.length - 1) {
             setCurrentQuestionIndex(prev => prev + 1);
         } else {
             // In a real app, you'd mark the course as complete in Firestore here.
             onBack(); 
         }
    };

    if (loading) {
         return <div className="p-8 text-center text-neutral-800 dark:text-white">Loading Questions...</div>;
    }

    if (quizQuestions.length === 0) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl text-neutral-800 dark:text-white">This course has no questions yet.</h2>
                <button onClick={onBack} className="mt-4 btn-secondary text-white font-bold py-2 px-4 rounded">Back to Courses</button>
            </div>
        )
    }
    
    if (!currentQuestion) return null;

    const getButtonClass = (index) => {
        let baseClass = "w-full text-left p-4 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-md hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/20 dark:hover:shadow-blue-400/20 transition-all duration-300 ease-in-out text-neutral-800 dark:text-neutral-200";
        if (selectedAnswer === null) return baseClass;
        if (index === currentQuestion.correctAnswer) return `${baseClass} bg-green-100 dark:bg-green-900/50 border-green-500`;
        if (index === selectedAnswer && selectedAnswer !== currentQuestion.correctAnswer) return `${baseClass} bg-red-100 dark:bg-red-900/50 border-red-500`;
        return `${baseClass} opacity-60`;
    };

    const isUIBlocked = showExitConfirm || selectedAnswer !== null;

    return (
        <div className="relative">
            {showExitConfirm && <ConfirmExitModal onConfirm={handleConfirmExit} onCancel={handleCancelExit} />}
            {selectedAnswer !== null && <AnswerFeedbackModal isCorrect={isCorrect} onNext={handleNextQuestion} />}

            <div className={`p-4 md:p-8 max-w-4xl mx-auto transition-filter duration-300 ${isUIBlocked ? 'blur-sm' : ''}`}>
                <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-6 md:p-8 shadow-inner dark:shadow-neutral-950">
                    <h2 className="text-3xl font-bold mb-4 text-neutral-900 dark:text-white">{course.title}</h2>
                    <div className="flex justify-between items-center border-t border-b border-neutral-300 dark:border-neutral-700 py-3 mb-8 text-sm">
                        <button onClick={handleBackButtonClick} className="text-neutral-600 dark:text-neutral-400 hover:text-blue-500 font-semibold">&larr; Back to Courses</button>
                        <span className="text-neutral-500 dark:text-neutral-400 hidden sm:block">Participant: <span className="font-semibold text-neutral-700 dark:text-neutral-200">{user.name}</span></span>
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
