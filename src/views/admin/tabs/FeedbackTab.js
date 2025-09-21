import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useCollection } from '../../../hooks/useCollection';
import { db } from '../../../firebase/config';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

const FeedbackSection = ({ title, content, type }) => {
    // FIX: Use separate state for each input field to prevent sharing text
    const [newMessage, setNewMessage] = useState('');
    const [newGifUrl, setNewGifUrl] = useState('');

    const docRef = doc(db, 'feedbackContent', type);

    const handleAddItem = async (field, value, setValue) => {
        if (!value.trim()) return;
        try {
            await updateDoc(docRef, {
                [field]: arrayUnion(value.trim())
            });
            setValue(''); // Reset the specific input field
        } catch (error) {
            console.error(`Error adding ${type} ${field}:`, error);
        }
    };

    const handleRemoveItem = async (field, item) => {
        try {
            await updateDoc(docRef, {
                [field]: arrayRemove(item)
            });
        } catch (error) {
            console.error(`Error removing ${type} ${field}:`, error);
        }
    };
    
    const inputBaseClasses = "w-full bg-neutral-100 dark:bg-neutral-700 p-2 rounded border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-white focus:ring-blue-500 focus:border-blue-500";


    return (
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md dark:shadow-neutral-900 p-4">
            <h3 className="font-semibold text-lg text-neutral-900 dark:text-white mb-4">{title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Messages */}
                <div>
                    <h4 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-2">Messages</h4>
                    <div className="space-y-2 h-40 overflow-y-auto pr-2 mb-2">
                        {(content?.messages || []).map((msg, index) => (
                            <div key={index} className="flex justify-between items-center text-sm bg-neutral-100 dark:bg-neutral-700/50 p-2 rounded">
                                {/* FIX: Added dark mode text color */}
                                <span className="truncate pr-2 text-neutral-800 dark:text-neutral-200">{msg}</span>
                                <button onClick={() => handleRemoveItem('messages', msg)} className="text-red-500 hover:text-red-700 text-xs font-semibold">Remove</button>
                            </div>
                        ))}
                    </div>
                    <div className="flex space-x-2">
                        <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="New message..." className={inputBaseClasses} />
                        {/* FIX: Themed button */}
                        <button onClick={() => handleAddItem('messages', newMessage, setNewMessage)} className="btn-primary text-white font-bold px-4 rounded text-sm">Add</button>
                    </div>
                </div>
                {/* GIFs */}
                <div>
                    <h4 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-2">GIFs</h4>
                     <div className="space-y-2 h-40 overflow-y-auto pr-2 mb-2">
                        {(content?.gifUrls || []).map((gif, index) => (
                            <div key={index} className="flex justify-between items-center text-sm bg-neutral-100 dark:bg-neutral-700/50 p-2 rounded">
                                <a href={gif} target="_blank" rel="noopener noreferrer" className="truncate pr-2 text-blue-500 hover:underline">Link to GIF</a>
                                <button onClick={() => handleRemoveItem('gifUrls', gif)} className="text-red-500 hover:text-red-700 text-xs font-semibold">Remove</button>
                            </div>
                        ))}
                    </div>
                    <div className="flex space-x-2">
                        <input type="url" value={newGifUrl} onChange={(e) => setNewGifUrl(e.target.value)} placeholder="New GIF URL..." className={inputBaseClasses} />
                         {/* FIX: Themed button */}
                        <button onClick={() => handleAddItem('gifUrls', newGifUrl, setNewGifUrl)} className="btn-primary text-white font-bold px-4 rounded text-sm">Add</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

FeedbackSection.propTypes = {
    title: PropTypes.string.isRequired,
    content: PropTypes.object,
    type: PropTypes.string.isRequired
};

const FeedbackTab = () => {
    const { data: feedbackData, loading, error } = useCollection('feedbackContent');

    const correctFeedback = useMemo(() => feedbackData.find(d => d.id === 'correct'), [feedbackData]);
    const incorrectFeedback = useMemo(() => feedbackData.find(d => d.id === 'incorrect'), [feedbackData]);

    if (loading) {
        return <div className="p-8 text-center">Loading feedback content...</div>;
    }
    if (error) {
        return <div className="p-8 text-center text-red-500">Error loading data. Please ensure the 'feedbackContent' collection exists.</div>;
    }

    return (
        <div className="space-y-6">
            <FeedbackSection title="Correct Answer Feedback" content={correctFeedback} type="correct" />
            <FeedbackSection title="Incorrect Answer Feedback" content={incorrectFeedback} type="incorrect" />
        </div>
    );
};

export default FeedbackTab;

