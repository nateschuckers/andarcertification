import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { db } from '../../../../firebase/config';
import { doc, updateDoc, collection, getDocs, writeBatch, query } from 'firebase/firestore';

const EditCourseModal = ({ course, onCancel, setStatusMessage }) => {
    const [formData, setFormData] = useState({
        title: course.title.split(' (')[0],
        level: course.level,
        quizLength: course.quizLength,
    });
    const [questions, setQuestions] = useState([]);
    const [loadingQuestions, setLoadingQuestions] = useState(true);

    useEffect(() => {
        const fetchQuestions = async () => {
            const q = query(collection(db, `courses/${course.id}/questions`));
            const querySnapshot = await getDocs(q);
            const fetchedQuestions = [];
            querySnapshot.forEach((doc) => {
                fetchedQuestions.push({ id: doc.id, ...doc.data() });
            });
            setQuestions(fetchedQuestions);
            setLoadingQuestions(false);
        };
        fetchQuestions();
    }, [course.id]);

    const handleFormChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
    };

    const handleQuestionChange = (index, field, value) => {
        const newQuestions = [...questions];
        newQuestions[index][field] = value;
        setQuestions(newQuestions);
    };
    
    const handleOptionChange = (qIndex, oIndex, value) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[oIndex] = value;
        setQuestions(newQuestions);
    };

    const handleSetCorrectAnswer = (qIndex, oIndex) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].correctAnswer = oIndex;
        setQuestions(newQuestions);
    };

    const handleAddQuestion = () => {
        setQuestions([...questions, { text: '', options: ['', '', '', ''], correctAnswer: 0 }]);
    };
    
    const handleDeleteQuestion = (index) => {
        const newQuestions = questions.filter((_, i) => i !== index);
        setQuestions(newQuestions);
    };

    const handleSaveChanges = async () => {
        try {
            const courseRef = doc(db, 'courses', course.id);
            await updateDoc(courseRef, {
                title: `${formData.title} (${formData.level})`,
                level: formData.level,
                quizLength: formData.quizLength,
            });

            const batch = writeBatch(db);
            const questionsSnapshot = await getDocs(collection(db, `courses/${course.id}/questions`));
            questionsSnapshot.forEach(doc => batch.delete(doc.ref));

            questions.forEach(q => {
                const newQuestionRef = doc(collection(db, `courses/${course.id}/questions`));
                batch.set(newQuestionRef, {
                    text: q.text,
                    options: q.options,
                    correctAnswer: q.correctAnswer
                });
            });
            
            await batch.commit();

            setStatusMessage({ message: 'Course and questions updated successfully.', type: 'success', key: Date.now() });
            onCancel();
        } catch (error) {
            console.error("Error updating course:", error);
            setStatusMessage({ message: `Error: ${error.message}`, type: 'error', key: Date.now() });
        }
    };

    const inputBaseClasses = "w-full mt-1 bg-neutral-100 dark:bg-neutral-700 p-2 rounded border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-white focus:ring-blue-500 focus:border-blue-500";
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md dark:shadow-neutral-900 p-6 w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Edit Course: {course.title}</h2>
                    <button onClick={onCancel} className="text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white text-2xl">&times;</button>
                </div>
                
                <div className="overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Course Title</label>
                            <input type="text" name="title" value={formData.title} onChange={handleFormChange} className={inputBaseClasses}/>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Level</label>
                            <input type="number" name="level" value={formData.level} onChange={handleFormChange} className={inputBaseClasses}/>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Quiz Length (questions)</label>
                            <input type="number" name="quizLength" value={formData.quizLength} onChange={handleFormChange} className={inputBaseClasses}/>
                        </div>
                    </div>
                    
                    <hr className="my-4 border-neutral-200 dark:border-neutral-700"/>

                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">Questions</h3>
                    {loadingQuestions ? <p>Loading questions...</p> : (
                        <div className="space-y-4">
                            {questions.map((q, qIndex) => (
                                <div key={qIndex} className="bg-neutral-50 dark:bg-neutral-900/50 p-3 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Question {qIndex + 1}</label>
                                        <button onClick={() => handleDeleteQuestion(qIndex)} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
                                    </div>
                                    <textarea value={q.text} onChange={e => handleQuestionChange(qIndex, 'text', e.target.value)} className={inputBaseClasses + " h-16"} />
                                    <div className="mt-2 space-y-2">
                                        {q.options.map((opt, oIndex) => (
                                            <div key={oIndex} className="flex items-center space-x-2">
                                                <input type="radio" name={`correct-answer-${qIndex}`} checked={q.correctAnswer === oIndex} onChange={() => handleSetCorrectAnswer(qIndex, oIndex)} />
                                                <input type="text" value={opt} onChange={e => handleOptionChange(qIndex, oIndex, e.target.value)} className={inputBaseClasses} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <button onClick={handleAddQuestion} className="w-full btn-secondary text-white text-sm py-2 px-3 rounded">Add Question</button>
                        </div>
                    )}
                </div>

                <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                    <button onClick={onCancel} className="btn-secondary text-white font-bold py-2 px-4 rounded">Cancel</button>
                    <button onClick={handleSaveChanges} className="btn-primary text-white font-bold py-2 px-4 rounded">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

EditCourseModal.propTypes = {
    course: PropTypes.object.isRequired,
    onCancel: PropTypes.func.isRequired,
    setStatusMessage: PropTypes.func.isRequired
};

export default EditCourseModal;

