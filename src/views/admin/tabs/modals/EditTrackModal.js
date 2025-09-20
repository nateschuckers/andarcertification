import React, { useState } from 'react';
import PropTypes from 'prop-types';

const EditTrackModal = ({ track, courses, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: track.name,
        year: track.year,
        icon: track.icon,
        requiredCourses: track.requiredCourses || [],
    });

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCourseSelection = (courseId) => {
        setFormData(prev => ({
            ...prev,
            requiredCourses: prev.requiredCourses.includes(courseId) 
                ? prev.requiredCourses.filter(id => id !== courseId) 
                : [...prev.requiredCourses, courseId]
        }));
    };
    
    const handleSave = () => {
        onSave(track.id, formData);
    };

    const inputBaseClasses = "w-full mt-1 bg-neutral-100 dark:bg-neutral-700 p-2 rounded border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-white focus:ring-blue-500 focus:border-blue-500";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md dark:shadow-neutral-900 p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Edit Path: {track.name}</h2>
                    <button onClick={onCancel} className="text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white text-2xl">&times;</button>
                </div>
                <div className="space-y-4">
                    <input type="text" placeholder="Path Name" name="name" value={formData.name} onChange={handleFormChange} required className={inputBaseClasses}/>
                    <div className="grid grid-cols-2 gap-4">
                        <input type="number" placeholder="Year" name="year" value={formData.year} onChange={handleFormChange} required className={inputBaseClasses}/>
                         <div className="flex items-center space-x-2">
                            <input type="text" placeholder="Icon" name="icon" value={formData.icon} onChange={handleFormChange} required className={inputBaseClasses}/>
                             <a href="https://fontawesome.com/icons" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" title="Browse Icons">
                                <i className="fa-solid fa-external-link-alt"></i>
                            </a>
                        </div>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Required Courses</label>
                         <div className="h-32 overflow-y-auto border border-neutral-300 dark:border-neutral-600 rounded p-2">
                            {courses.filter(c => !c.isArchived).map(course => (
                                <div key={course.id} className="flex items-center p-1">
                                    <input type="checkbox" id={`edit-track-course-${course.id}`} checked={formData.requiredCourses.includes(course.id)} onChange={() => handleCourseSelection(course.id)} className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 bg-neutral-100 dark:bg-neutral-700 dark:border-neutral-600 mr-2"/>
                                    <label htmlFor={`edit-track-course-${course.id}`} className="text-sm text-neutral-800 dark:text-neutral-200">{course.title}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex justify-end space-x-4 mt-6">
                    <button onClick={onCancel} className="btn-secondary text-white font-bold py-2 px-4 rounded">Cancel</button>
                    <button onClick={handleSave} className="btn-primary text-white font-bold py-2 px-4 rounded">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

EditTrackModal.propTypes = {
    track: PropTypes.object.isRequired,
    courses: PropTypes.array.isRequired,
    onSave: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
};

export default EditTrackModal;
