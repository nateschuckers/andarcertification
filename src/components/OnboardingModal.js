import React, { useState } from 'react';
import PropTypes from 'prop-types';

const OnboardingModal = ({ user, onClose }) => {
    const [step, setStep] = useState(0);

    const userSlides = [
        { icon: 'fa-rocket', title: 'Welcome to Your Dashboard!', text: 'This is your central hub for all certification courses. Let\'s quickly go over the key features.' },
        { icon: 'fa-tasks', title: 'Your Courses & Paths', text: 'Your assigned courses are organized into Certification Paths. Your goal is to complete all required courses in a path to earn the certification.' },
        { icon: 'fa-check-double', title: 'Taking Quizzes', text: 'To complete a course, you must pass a quiz. The questions and the order of answers are randomized each time to keep you on your toes!' },
        { icon: 'fa-chart-pie', title: 'Track Your Progress', text: 'On the right side of your dashboard, you can view your total training time, earned achievements, and your rank on the company leaderboard. Good luck!' }
    ];

    const adminSlides = [
        { icon: 'fa-shield-halved', title: 'Welcome, Admin!', text: 'This is your Admin Dashboard, the command center for managing the certification program.' },
        { icon: 'fa-table-list', title: 'Certification Matrix', text: 'Get a powerful, at-a-glance view of every user\'s progress, completion percentages, and overall status. Identify users who need attention quickly.' },
        { icon: 'fa-chart-line', title: 'Usage Statistics', text: 'Dive into the data. Analyze login activity, course attempt rates, and identify trends in pass/fail rates for courses and even individual questions.' },
        { icon: 'fa-users-cog', title: 'Management Tools', text: 'Easily create new user profiles, manage courses, and mass-assign or remove courses and entire certification paths for single or multiple users.' },
        { icon: 'fa-magic-wand-sparkles', title: 'AI Question Generator', text: 'Save time by using the AI-powered generator to create new quiz questions from your PDF documents or website URLs.' }
    ];

    const slides = user.isAdmin ? adminSlides : userSlides;
    const currentSlide = slides[step];

    const handleNext = () => {
        if (step < slides.length - 1) {
            setStep(step + 1);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (step > 0) {
            setStep(step - 1);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg shadow-2xl max-w-lg w-full m-4">
                <div className="p-8 text-center">
                    <div className="w-20 h-20 rounded-full bg-blue-500 text-white flex items-center justify-center text-4xl mx-auto mb-6">
                        <i className={`fa ${currentSlide.icon}`}></i>
                    </div>
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">{currentSlide.title}</h2>
                    <p className="text-neutral-600 dark:text-neutral-300 mb-8">{currentSlide.text}</p>
                </div>
                <div className="bg-white dark:bg-neutral-900/50 p-4 flex justify-between items-center rounded-b-lg">
                    <div className="flex items-center space-x-2">
                        {slides.map((_, i) => (
                            <div key={i} className={`w-2 h-2 rounded-full ${i === step ? 'bg-blue-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}></div>
                        ))}
                    </div>
                    <div className="flex space-x-2">
                        {step > 0 && ( <button onClick={handlePrev} className="btn-secondary text-white font-bold py-2 px-4 rounded-lg">Back</button> )}
                        <button onClick={handleNext} className="btn-primary text-white font-bold py-2 px-4 rounded-lg">{step === slides.length - 1 ? 'Finish' : 'Next'}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

OnboardingModal.propTypes = {
    user: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default OnboardingModal;
