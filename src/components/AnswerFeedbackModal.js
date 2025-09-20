import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { CORRECT_GIFS, CORRECT_MESSAGES, INCORRECT_GIFS, INCORRECT_MESSAGES } from '../utils/constants';

const AnswerFeedbackModal = ({ isCorrect, onNext }) => {
    const gifUrl = useMemo(() => {
        const gifList = isCorrect ? CORRECT_GIFS : INCORRECT_GIFS;
        return gifList[Math.floor(Math.random() * gifList.length)];
    }, [isCorrect]);

    const message = useMemo(() => {
        if (isCorrect) return CORRECT_MESSAGES[Math.floor(Math.random() * CORRECT_MESSAGES.length)];
        return INCORRECT_MESSAGES[Math.floor(Math.random() * INCORRECT_MESSAGES.length)];
    }, [isCorrect]);

    const icon = isCorrect ? 'fa-check' : 'fa-times';
    const iconColor = isCorrect ? 'bg-green-500' : 'bg-red-500';
    const textColor = isCorrect ? 'text-green-500' : 'text-red-500';
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="relative text-center p-8 rounded-lg max-w-sm w-full">
                 <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full ${iconColor} flex items-center justify-center text-white text-3xl`}>
                    <i className={`fa ${icon}`}></i>
                </div>
                <div className="bg-neutral-100 dark:bg-neutral-800 p-6 pt-12 rounded-lg shadow-2xl">
                    <img src={gifUrl} alt={isCorrect ? 'Correct' : 'Incorrect'} className="w-full h-48 object-contain rounded-lg mb-4" />
                    <p className={`text-xl font-bold ${textColor} mb-6`}>{message}</p>
                    <button 
                        onClick={onNext} 
                        className="w-full btn-primary text-white font-bold py-3 px-6 rounded-lg shadow-md hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 ease-in-out">
                        Next Question
                    </button>
                </div>
            </div>
        </div>
    );
};

AnswerFeedbackModal.propTypes = {
    isCorrect: PropTypes.bool.isRequired,
    onNext: PropTypes.func.isRequired
};

export default AnswerFeedbackModal;

