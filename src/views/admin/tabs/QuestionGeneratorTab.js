import React, { useState } from 'react';
import PropTypes from 'prop-types';

const QuestionGeneratorTab = () => {
    const [status, setStatus] = useState({ 
        message: 'Note: The AI generation logic is a client-side simulation. In a real app, this requires a secure backend (e.g., Cloud Function) to protect the API key.', 
        type: 'info' 
    });

    // In a real application, you would have state for form inputs:
    // const [sourceType, setSourceType] = useState('url');
    // const [sourceUrl, setSourceUrl] = useState('');
    // const [sourceText, setSourceText] = useState('');
    // const [numQuestions, setNumQuestions] = useState(5);
    // const [targetCourseId, setTargetCourseId] = useState('');
    // const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        // This is where you would trigger the backend call to the AI model
        setStatus({ message: 'This feature is a placeholder for a future backend integration.', type: 'info'});
    };

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md dark:shadow-neutral-900 p-8 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center text-neutral-800 dark:text-white mb-2">Course Question Generator</h2>
            <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mb-6">
                Automatically create quiz questions from a PDF document or website URL.
            </p>
            
            {status.message && (
                <div className={`text-center p-2 rounded-md my-4 text-sm ${
                    status.type === 'info' 
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' 
                        : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                }`}>
                    {status.message}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <fieldset disabled className="space-y-4 opacity-50 cursor-not-allowed">
                     <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Target Course</label>
                        <select className="w-full bg-neutral-100 dark:bg-neutral-700 p-2 rounded border border-neutral-300 dark:border-neutral-600">
                           <option>Select a course to add questions to...</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Content Source</label>
                        <textarea 
                            placeholder="Paste content here or provide a URL (feature disabled)."
                            className="w-full bg-neutral-100 dark:bg-neutral-700 p-2 rounded border border-neutral-300 dark:border-neutral-600 min-h-[150px]"
                        />
                    </div>
                    <button type="submit" className="w-full btn-primary text-white font-bold py-2 px-4 rounded">
                        Generate Questions (Disabled)
                    </button>
                </fieldset>
            </form>
        </div>
    );
};

QuestionGeneratorTab.propTypes = {
    courses: PropTypes.array, // Optional: for populating the select dropdown
};

export default QuestionGeneratorTab;
