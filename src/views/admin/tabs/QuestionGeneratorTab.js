import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types'; // <--- FIX: Added this import statement
import { useCollection } from '../../../hooks/useCollection';
import { db } from '../../../firebase/config';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, addDoc, updateDoc, writeBatch, collection, arrayUnion } from 'firebase/firestore';

// Note: Client-side PDF parsing can be resource-intensive for large files.
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;


const QuestionGeneratorTab = () => {
    const { data: courses, loading: coursesLoading } = useCollection('courses');
    const { data: tracks, loading: tracksLoading } = useCollection('tracks');
    
    // Form State
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [isCreatingNewCourse, setIsCreatingNewCourse] = useState(false);
    const [newCourseTitle, setNewCourseTitle] = useState('');
    const [newCourseLevel, setNewCourseLevel] = useState(101);
    const [selectedTrackId, setSelectedTrackId] = useState('');
    const [isCreatingNewTrack, setIsCreatingNewTrack] = useState(false);
    const [newTrackName, setNewTrackName] = useState('');
    const [pdfFiles, setPdfFiles] = useState(null);
    const [numQuestionsToGenerate, setNumQuestionsToGenerate] = useState(10);
    const [numQuestionsToUse, setNumQuestionsToUse] = useState(5);
    const [difficulty, setDifficulty] = useState(5);
    
    // Process State
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState({ text: '', type: 'info' });
    const [generatedQuestions, setGeneratedQuestions] = useState([]);
    const [isPreviewing, setIsPreviewing] = useState(false);
    
    useEffect(() => {
        if (selectedCourseId === 'CREATE_NEW') {
            setIsCreatingNewCourse(true);
        } else {
            setIsCreatingNewCourse(false);
            const course = courses.find(c => c.id === selectedCourseId);
            if (course) {
                setNumQuestionsToUse(course.quizLength || 5);
            }
        }
    }, [selectedCourseId, courses]);

    useEffect(() => {
        if (selectedTrackId === 'CREATE_NEW') {
            setIsCreatingNewTrack(true);
        } else {
            setIsCreatingNewTrack(false);
        }
    }, [selectedTrackId]);
    
    const handleGenerate = async () => {
        if (!pdfFiles || pdfFiles.length === 0) {
            setStatusMessage({ text: 'Please select one or more PDF files.', type: 'error' });
            return;
        }
        if (!isCreatingNewCourse && !selectedCourseId) {
             setStatusMessage({ text: 'Please select an existing course or choose to create a new one.', type: 'error' });
            return;
        }
        if (isCreatingNewCourse && (!newCourseTitle || !newCourseLevel)) {
             setStatusMessage({ text: 'Please provide a title and level for the new course.', type: 'error' });
            return;
        }

        setIsLoading(true);
        setStatusMessage({ text: `Extracting text from ${pdfFiles.length} PDF(s)...`, type: 'info' });

        try {
            let combinedText = '';
            for (const file of pdfFiles) {
                const text = await extractTextFromPDF(file);
                combinedText += text + '\n\n';
            }

            setStatusMessage({ text: 'Text extracted. Calling AI to generate questions... This may take a moment.', type: 'info' });
            
            const functions = getFunctions();
            const generateQuestionsFn = httpsCallable(functions, 'generateQuestions');
            const result = await generateQuestionsFn({
                text: combinedText,
                difficulty: difficulty,
                numQuestions: numQuestionsToGenerate
            });

            const questions = result.data.questions;
            if (!questions || !Array.isArray(questions)) {
                throw new Error("AI did not return a valid question array.");
            }
            
            setGeneratedQuestions(questions);
            setIsPreviewing(true);
            setStatusMessage({ text: `Successfully generated ${questions.length} questions. Please review them.`, type: 'success' });

        } catch (error) {
            console.error("Generation Error:", error);
            setStatusMessage({ text: `An error occurred: ${error.message}`, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const extractTextFromPDF = async (file) => {
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onload = async (event) => {
                try {
                    const typedArray = new Uint8Array(event.target.result);
                    const pdf = await pdfjsLib.getDocument(typedArray).promise;
                    let fullText = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const content = await page.getTextContent();
                        fullText += content.items.map(item => item.str).join(' ');
                    }
                    resolve(fullText);
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsArrayBuffer(file);
        });
    };
    
    const handleSave = async () => {
        setIsLoading(true);
        setStatusMessage({ text: 'Saving to database...', type: 'info' });

        try {
            let finalCourseId = selectedCourseId;

            // Step 1: Create new track if necessary
            let finalTrackId = selectedTrackId;
            if (isCreatingNewTrack && newTrackName) {
                const trackRef = await addDoc(collection(db, 'tracks'), {
                    name: newTrackName,
                    icon: 'fa-microchip', // Default icon
                    isArchived: false,
                    requiredCourses: []
                });
                finalTrackId = trackRef.id;
            }

            // Step 2: Create new course if necessary
            if (isCreatingNewCourse) {
                const courseRef = await addDoc(collection(db, 'courses'), {
                    title: `${newCourseTitle} (${newCourseLevel})`,
                    level: Number(newCourseLevel),
                    quizLength: Number(numQuestionsToUse),
                    isArchived: false
                });
                finalCourseId = courseRef.id;
            } else {
                 // Update quizLength on existing course
                 await updateDoc(doc(db, 'courses', finalCourseId), {
                    quizLength: Number(numQuestionsToUse),
                 });
            }
            
            // Step 3: Associate course with track if a track is selected/created
            if (finalTrackId && finalTrackId !== 'CREATE_NEW' && finalCourseId) {
                await updateDoc(doc(db, 'tracks', finalTrackId), {
                    requiredCourses: arrayUnion(finalCourseId)
                });
            }
            
            // Step 4: Batch write questions to the course subcollection
            const batch = writeBatch(db);
            generatedQuestions.forEach(q => {
                const questionRef = doc(collection(db, `courses/${finalCourseId}/questions`));
                batch.set(questionRef, q);
            });
            await batch.commit();

            setStatusMessage({ text: `Successfully saved ${generatedQuestions.length} questions.`, type: 'success' });
            // Reset form
            setIsPreviewing(false);
            setGeneratedQuestions([]);
            setSelectedCourseId('');
            setNewCourseTitle('');
            setSelectedTrackId('');
            setNewTrackName('');
            setPdfFiles(null);


        } catch (error) {
             console.error("Save Error:", error);
            setStatusMessage({ text: `An error occurred while saving: ${error.message}`, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const inputClasses = "w-full mt-1 bg-neutral-100 dark:bg-neutral-700 p-2 rounded border border-neutral-300 dark:border-neutral-600 focus:ring-blue-500 focus:border-blue-500";
    const labelClasses = "block text-sm font-medium text-neutral-700 dark:text-neutral-300";

    if (isPreviewing) {
        return <QuestionPreview questions={generatedQuestions} setQuestions={setGeneratedQuestions} onSave={handleSave} onCancel={() => setIsPreviewing(false)} isLoading={isLoading} />;
    }

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md dark:shadow-neutral-900 p-8 max-w-3xl mx-auto space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-center text-neutral-800 dark:text-white mb-2">AI Course Question Generator</h2>
                <p className="text-center text-neutral-500 dark:text-neutral-400">Generate quiz questions from PDF documents using AI.</p>
            </div>

            {statusMessage.text && (
                <div className={`text-center p-3 rounded-md text-sm ${statusMessage.type === 'success' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' : statusMessage.type === 'error' ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'}`}>
                    {statusMessage.text}
                </div>
            )}
            
            {/* Course & Track Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg dark:border-neutral-700">
                <div>
                    <label htmlFor="courseSelector" className={labelClasses}>1. Select Course</label>
                    <select id="courseSelector" value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} disabled={coursesLoading} className={inputClasses}>
                        <option value="" disabled>Select existing...</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        <option value="CREATE_NEW">--- Create New Course ---</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="trackSelector" className={labelClasses}>2. Assign to Path (Optional)</label>
                    <select id="trackSelector" value={selectedTrackId} onChange={e => setSelectedTrackId(e.target.value)} disabled={tracksLoading} className={inputClasses}>
                        <option value="" >No path assignment</option>
                        {tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                         <option value="CREATE_NEW">--- Create New Path ---</option>
                    </select>
                </div>
            </div>

            {/* New Course & Track Fields */}
            {(isCreatingNewCourse || isCreatingNewTrack) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/30">
                    {isCreatingNewCourse && (
                        <div className="space-y-4">
                            <h4 className="font-semibold text-neutral-800 dark:text-white">New Course Details</h4>
                             <div>
                                <label htmlFor="newCourseTitle" className={labelClasses}>Course Title</label>
                                <input id="newCourseTitle" type="text" value={newCourseTitle} onChange={e => setNewCourseTitle(e.target.value)} placeholder="e.g. Advanced Andar" className={inputClasses} />
                            </div>
                            <div>
                                <label htmlFor="newCourseLevel" className={labelClasses}>Course Level</label>
                                <input id="newCourseLevel" type="number" value={newCourseLevel} onChange={e => setNewCourseLevel(e.target.value)} placeholder="e.g. 101" className={inputClasses} />
                            </div>
                        </div>
                    )}
                    {isCreatingNewTrack && (
                        <div className="space-y-4">
                            <h4 className="font-semibold text-neutral-800 dark:text-white">New Path Details</h4>
                            <div>
                                <label htmlFor="newTrackName" className={labelClasses}>Path Name</label>
                                <input id="newTrackName" type="text" value={newTrackName} onChange={e => setNewTrackName(e.target.value)} placeholder="e.g. 2025 Certification" className={inputClasses} />
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {/* Generation Parameters */}
            <div className="p-4 border rounded-lg dark:border-neutral-700 space-y-4">
                 <div>
                    <label htmlFor="pdfFile" className={labelClasses}>3. Upload PDF Document(s)</label>
                    <input type="file" id="pdfFile" accept="application/pdf" onChange={e => setPdfFiles(e.target.files)} className={inputClasses + " file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"} multiple />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="numQuestionsToGenerate" className={labelClasses}>Generate Pool</label>
                        <input id="numQuestionsToGenerate" type="number" value={numQuestionsToGenerate} onChange={e => setNumQuestionsToGenerate(e.target.value)} min="1" max="50" className={inputClasses} />
                    </div>
                     <div>
                        <label htmlFor="numQuestionsToUse" className={labelClasses}>Use in Quiz</label>
                        <input id="numQuestionsToUse" type="number" value={numQuestionsToUse} onChange={e => setNumQuestionsToUse(e.target.value)} min="1" max={numQuestionsToGenerate} className={inputClasses} />
                    </div>
                    <div>
                        <label htmlFor="difficulty" className={labelClasses}>Difficulty: <span className="font-semibold">{difficulty}</span></label>
                        <input id="difficulty" type="range" value={difficulty} onChange={e => setDifficulty(e.target.value)} min="1" max="10" className="w-full mt-2" />
                    </div>
                </div>
            </div>

            <button onClick={handleGenerate} disabled={isLoading} className="w-full btn-primary text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center space-x-2 hover:bg-blue-700 transition-colors disabled:bg-neutral-400">
                {isLoading ? <><i className="fa fa-spinner fa-spin"></i><span>Generating...</span></> : <span>Generate Questions</span>}
            </button>
        </div>
    );
};

const QuestionPreview = ({ questions, setQuestions, onSave, onCancel, isLoading }) => {
    // Component logic for previewing, editing, and saving questions
    const handleQuestionTextChange = (index, newText) => {
        const updated = [...questions];
        updated[index].text = newText;
        setQuestions(updated);
    };
    const handleOptionChange = (qIndex, oIndex, newText) => {
        const updated = [...questions];
        updated[qIndex].options[oIndex] = newText;
        setQuestions(updated);
    };
     const handleCorrectAnswerChange = (qIndex, oIndex) => {
        const updated = [...questions];
        updated[qIndex].correctAnswer = oIndex;
        setQuestions(updated);
    };

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md dark:shadow-neutral-900 p-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-neutral-800 dark:text-white mb-4">Review Generated Questions</h2>
            <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2">
                {questions.map((q, qIndex) => (
                     <div key={qIndex} className="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-lg">
                        <textarea value={q.text} onChange={e => handleQuestionTextChange(qIndex, e.target.value)} className="w-full p-2 border rounded-md mb-2 bg-transparent dark:border-neutral-600"/>
                        <div className="space-y-2">
                            {q.options.map((opt, oIndex) => (
                                <div key={oIndex} className="flex items-center space-x-2">
                                    <input type="radio" name={`q-${qIndex}-correct`} checked={oIndex === q.correctAnswer} onChange={() => handleCorrectAnswerChange(qIndex, oIndex)} />
                                    <input type="text" value={opt} onChange={e => handleOptionChange(qIndex, oIndex, e.target.value)} className="w-full p-2 border rounded-md bg-transparent dark:border-neutral-600" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex justify-end space-x-4 mt-6 pt-4 border-t dark:border-neutral-700">
                <button onClick={onCancel} className="btn-secondary text-white font-bold py-2 px-4 rounded" disabled={isLoading}>Cancel</button>
                <button onClick={onSave} className="btn-primary text-white font-bold py-2 px-4 rounded flex items-center justify-center" disabled={isLoading}>
                    {isLoading ? <><i className="fa fa-spinner fa-spin mr-2"></i><span>Saving...</span></> : <span>Save to Course</span>}
                </button>
            </div>
        </div>
    )
};


QuestionPreview.propTypes = {
    questions: PropTypes.array.isRequired,
    setQuestions: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    isLoading: PropTypes.bool.isRequired,
};


export default QuestionGeneratorTab;
```

### Next Steps

After you've updated the file with the clean code, please push the change to your `refactor` branch on GitHub.

```bash
git add src/views/admin/tabs/QuestionGeneratorTab.js
```
```bash
git commit -m "Fix: Add missing PropTypes import to QuestionGeneratorTab"
```
```bash
git push origin refactor

