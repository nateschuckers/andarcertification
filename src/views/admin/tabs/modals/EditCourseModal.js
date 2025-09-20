import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { db } from '../../../../firebase/config';
import { 
    doc, 
    updateDoc, 
    collection, 
    addDoc, 
    deleteDoc,
    onSnapshot,
    query
} from 'firebase/firestore';

const EditCourseModal = ({ course, onCancel, setStatusMessage }) => {
    const [formData, setFormData] = useState({ 
        title: course.title,
        quizLength: course.quizLength || 1
    });
    const [questions, setQuestions] = useState([]);
    const [loadingQuestions, setLoadingQuestions] = useState(true);
    const [newQuestionText, setNewQuestionText] = useState('');
    const [newQuestionOptions, setNewQuestionOptions] = useState(['', '', '', '']);
    const [newQuestionCorrectAnswer, setNewQuestionCorrectAnswer] = useState(0);

    useEffect(() => {
        const q = query(collection(db, `courses/${course.id}/questions`));
        const unsub = onSnapshot(q, (snapshot) => {
            const fetchedQuestions = [];
            snapshot.forEach(doc => fetchedQuestions.push({ id: doc.id, ...doc.data() }));
            setQuestions(fetchedQuestions);
            setLoadingQuestions(false);
        });
        return () => unsub();
    }, [course.id]);


    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleOptionChange = (index, value) => {
        const updatedOptions = [...newQuestionOptions];
        updatedOptions[index] = value;
        setNewQuestionOptions(updatedOptions);
    };
    
    const handleAddQuestion = async (e) => {
        e.preventDefault();
        if (!newQuestionText || newQuestionOptions.some(opt => !opt)) {
            setStatusMessage({ message: 'Please fill out the question and all four answer options.', type: 'error', key: Date.now() });
            return;
        }
        try {
            await addDoc(collection(db, `courses/${course.id}/questions`), {
                text: newQuestionText,
                options: newQuestionOptions,
                correctAnswer: Number(newQuestionCorrectAnswer),
            });
            setNewQuestionText('');
            setNewQuestionOptions(['', '', '', '']);
            setNewQuestionCorrectAnswer(0);
            setStatusMessage({ message: 'Question added successfully.', type: 'success', key: Date.now() });
        } catch (error) {
            console.error("Error adding question: ", error);
            setStatusMessage({ message: `Error: ${error.message}`, type: 'error', key: Date.now() });
        }
    };

    const handleDeleteQuestion = async (questionId) => {
        try {
            await deleteDoc(doc(db, `courses/${course.id}/questions`, questionId));
            setStatusMessage({ message: 'Question deleted.', type: 'success', key: Date.now() });
        } catch (error) {
            console.error("Error deleting question: ", error);
            setStatusMessage({ message: `Error: ${error.message}`, type: 'error', key: Date.now() });
        }
    };

    const handleSaveChanges = async () => {
        try {
            await updateDoc(doc(db, "courses", course.id), {
                title: formData.title,
                quizLength: Number(formData.quizLength)
            });
            setStatusMessage({ message: 'Course updated successfully.', type: 'success', key: Date.now() });
            onCancel();
        } catch (error) {
            console.error("Error updating course: ", error);
            setStatusMessage({ message: `Error: ${error.message}`, type: 'error', key: Date.now() });
        }
    };

    const inputBaseClasses = "w-full mt-1 bg-neutral-100 dark:bg-neutral-700 p-2 rounded border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-white focus:ring-blue-500 focus:border-blue-500";
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md dark:shadow-neutral-900 p-6 w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Edit Course: {course.title}</h2>
                    <button onClick={onCancel} className="text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white text-2xl">&times;</button>
                </div>
                
                <div className="overflow-y-auto pr-2 flex-grow">
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Course Title</label>
                            <input type="text" name="title" value={formData.title} onChange={handleFormChange} className={inputBaseClasses} />
                        </div>
                        <div>
                             <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Number of Questions in Quiz</label>
                            <input type="number" name="quizLength" value={formData.quizLength} onChange={handleFormChange} min="1" className={inputBaseClasses} />
                        </div>
                    </div>

                    <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
                        <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Manage Questions</h3>
                        <form onSubmit={handleAddQuestion} className="space-y-3 p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg mb-4">
                            <h4 className="font-semibold text-neutral-800 dark:text-white">Add New Question</h4>
                            <textarea value={newQuestionText} onChange={e => setNewQuestionText(e.target.value)} placeholder="Question Text" required className={inputBaseClasses + " min-h-[60px]"} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {newQuestionOptions.map((opt, i) => (
                                    <div key={i} className="flex items-center space-x-2">
                                        <input type="radio" name="correctAnswer" value={i} checked={newQuestionCorrectAnswer == i} onChange={e => setNewQuestionCorrectAnswer(e.target.value)} id={`option-radio-${i}`} className="h-4 w-4 text-blue-600 focus:ring-blue-500 bg-neutral-100 dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600"/>
                                        <input type="text" value={opt} onChange={e => handleOptionChange(i, e.target.value)} placeholder={`Answer Option ${i+1}`} required className={inputBaseClasses + " mt-0"} />
                                    </div>
                                ))}
                            </div>
                            <button type="submit" className="w-full btn-primary text-white font-bold py-2 px-4 rounded">Add Question</button>
                        </form>

                        <div className="space-y-2">
                            {loadingQuestions ? <p>Loading questions...</p> : questions.map(q => (
                                <div key={q.id} className="text-sm p-2 rounded bg-neutral-100 dark:bg-neutral-700/50 flex justify-between items-start">
                                    <div className="flex-grow">
                                        <p className="font-semibold text-neutral-800 dark:text-neutral-200">{q.text}</p>
                                        <ul className="list-disc list-inside mt-1">
                                            {q.options.map((opt, i) => <li key={i} className={q.correctAnswer === i ? 'font-bold text-green-600 dark:text-green-400' : 'text-neutral-600 dark:text-neutral-400'}>{opt}</li>)}
                                        </ul>
                                    </div>
                                    <button onClick={() => handleDeleteQuestion(q.id)} className="text-red-500 hover:underline text-xs flex-shrink-0 ml-4">Delete</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700 flex-shrink-0">
                    <button onClick={onCancel} className="btn-secondary text-white font-bold py-2 px-4 rounded">Cancel</button>
                    <button onClick={handleSaveChanges} className="btn-primary text-white font-bold py-2 px-4 rounded">Save All Changes</button>
                </div>
            </div>
        </div>
    );
};

EditCourseModal.propTypes = {
    course: PropTypes.object.isRequired,
    onCancel: PropTypes.func.isRequired,
    setStatusMessage: PropTypes.func.isRequired,
};

export default EditCourseModal;
