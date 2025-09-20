import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { db, auth, app as mainApp } from '../../../firebase/config';
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
} from 'firebase/auth';
import {
    collection,
    doc,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    writeBatch,
    getDocs
} from 'firebase/firestore';

import CollapsibleCard from '../../../components/CollapsibleCard';
import ConfirmDeleteModal from '../../../components/ConfirmDeleteModal';
import EditUserModal from './modals/EditUserModal';
import EditTrackModal from './modals/EditTrackModal';
import EditCourseModal from './modals/EditCourseModal';

const ManagementTab = ({ users, courses, tracks }) => {
    // State for modals
    const [editingUser, setEditingUser] = useState(null);
    const [editingCourse, setEditingCourse] = useState(null);
    const [editingTrack, setEditingTrack] = useState(null);
    const [deletingItem, setDeletingItem] = useState(null);

    // State for controlled forms (Creations)
    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);
    
    const [newCourseTitle, setNewCourseTitle] = useState('');
    const [newCourseLevel, setNewCourseLevel] = useState(101);

    const [newTrackName, setNewTrackName] = useState('');
    const [newTrackYear, setNewTrackYear] = useState(new Date().getFullYear());
    const [newTrackIcon, setNewTrackIcon] = useState('fa-star');
    const [newTrackCourses, setNewTrackCourses] = useState([]);

    // State for mass assignment
    const [massAssignUsers, setMassAssignUsers] = useState([]);
    const [assignmentTarget, setAssignmentTarget] = useState('');
    const [assignmentDueDate, setAssignmentDueDate] = useState('');
    
    // UI feedback
    const [statusMessage, setStatusMessage] = useState({ message: '', type: 'neutral', key: 0 });

    useEffect(() => {
        if (statusMessage.message) {
            const timer = setTimeout(() => {
                setStatusMessage({ message: '', type: 'neutral', key: 0 });
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [statusMessage.key, statusMessage.message]);

    // --- Handlers for CRUD operations ---

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setStatusMessage({ message: `Creating authentication for ${newUserEmail}...`, type: 'info', key: Date.now() });

        const tempAppName = `temp-app-${Date.now()}`;
        const tempApp = initializeApp(mainApp.options, tempAppName);
        const tempAuth = getAuth(tempApp);

        try {
            const userCredential = await createUserWithEmailAndPassword(tempAuth, newUserEmail, newUserPassword);
            const newUser = userCredential.user;

            await setDoc(doc(db, "users", newUser.uid), {
                name: newUserName,
                email: newUserEmail,
                isAdmin: newUserIsAdmin,
                trackIds: [],
                themePreference: 'dark' // Add default theme preference
            });
            await setDoc(doc(db, "activityLogs", newUser.uid), {
                logins: 0, lastLogin: null, totalTrainingTime: 0,
                attempts: 0, passes: 0, fails: 0, passRate: 0
            });

            setStatusMessage({ message: `Successfully created user ${newUserName}.`, type: 'success', key: Date.now() });
            setNewUserName(''); setNewUserEmail(''); setNewUserPassword(''); setNewUserIsAdmin(false);
        } catch (error) {
            console.error("Error creating user:", error);
            setStatusMessage({ message: `Error: ${error.message}`, type: 'error', key: Date.now() });
        }
    };

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        if (!newCourseTitle) return;
        try {
            await addDoc(collection(db, "courses"), {
                title: `${newCourseTitle} (${newCourseLevel})`,
                level: Number(newCourseLevel),
                quizLength: 1,
                type: 'standard',
                isArchived: false,
            });
            setStatusMessage({ message: 'Course created successfully.', type: 'success', key: Date.now() });
            setNewCourseTitle('');
            setNewCourseLevel(101);
        } catch (error) {
            console.error("Error creating course:", error);
            setStatusMessage({ message: `Error: ${error.message}`, type: 'error', key: Date.now() });
        }
    };
    
    const handleCreateTrack = async (e) => {
        e.preventDefault();
        if (!newTrackName) return;
        try {
            await addDoc(collection(db, "tracks"), {
                name: newTrackName,
                year: Number(newTrackYear),
                icon: newTrackIcon,
                requiredCourses: newTrackCourses,
                isArchived: false,
            });
            setStatusMessage({ message: 'Certification Path created successfully.', type: 'success', key: Date.now() });
            setNewTrackName('');
            setNewTrackYear(new Date().getFullYear());
            setNewTrackIcon('fa-star');
            setNewTrackCourses([]);
        } catch (error) {
            console.error("Error creating track:", error);
            setStatusMessage({ message: `Error: ${error.message}`, type: 'error', key: Date.now() });
        }
    };

    const handleSaveUser = async (userId, formData) => {
        try {
            const { email, ...updatableData } = formData;
            await updateDoc(doc(db, "users", userId), updatableData);
            setStatusMessage({ message: 'User updated successfully.', type: 'success', key: Date.now() });
        } catch (error) {
             console.error("Error updating user:", error);
             setStatusMessage({ message: `Error: ${error.message}`, type: 'error', key: Date.now() });
        } finally {
            setEditingUser(null);
        }
    };
    
    const handleSaveTrack = async (trackId, formData) => {
        try {
            await updateDoc(doc(db, "tracks", trackId), formData);
            setStatusMessage({ message: 'Path updated successfully.', type: 'success', key: Date.now() });
        } catch (error) {
             console.error("Error updating track:", error);
             setStatusMessage({ message: `Error: ${error.message}`, type: 'error', key: Date.now() });
        } finally {
            setEditingTrack(null);
        }
    };
    
    const handleArchiveItem = async (item, type) => {
        try {
            await updateDoc(doc(db, `${type}s`, item.id), { isArchived: !item.isArchived });
            setStatusMessage({ message: `${type} status updated.`, type: 'success', key: Date.now() });
        } catch (error) {
            console.error(`Error archiving ${type}:`, error);
            setStatusMessage({ message: `Error: ${error.message}`, type: 'error', key: Date.now() });
        }
    };

    const handleDeleteItem = async () => {
        if (!deletingItem) return;
        const { type, data } = deletingItem;

        try {
            if (type === 'user') {
                const userCourseDataSnapshot = await getDocs(collection(db, `users/${data.id}/userCourseData`));
                const batch = writeBatch(db);
                userCourseDataSnapshot.forEach(doc => batch.delete(doc.ref));
                await batch.commit();

                await deleteDoc(doc(db, 'users', data.id));
                await deleteDoc(doc(db, 'activityLogs', data.id));
            } else {
                 await deleteDoc(doc(db, `${type}s`, data.id));
            }
            setStatusMessage({ message: `${type} deleted successfully.`, type: 'success', key: Date.now() });
        } catch (error) {
            console.error(`Error deleting ${type}:`, error);
            setStatusMessage({ message: `Error: ${error.message}`, type: 'error', key: Date.now() });
        } finally {
            setDeletingItem(null);
        }
    };
    
    const handleResetPassword = async (email) => {
        if (!email) {
            setStatusMessage({ message: 'User email is not available.', type: 'error', key: Date.now() });
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email);
            setStatusMessage({ message: `Password reset email sent to ${email}.`, type: 'success', key: Date.now() });
        } catch (error) {
            console.error("Error sending password reset email:", error);
            setStatusMessage({ message: `Error: ${error.message}`, type: 'error', key: Date.now() });
        }
    };

    const handleMassAssign = async () => {
        if (!assignmentTarget || massAssignUsers.length === 0 || !assignmentDueDate) {
            setStatusMessage({ message: 'Please select a target, users, and a due date.', type: 'error', key: Date.now() });
            return;
        }
        
        const batch = writeBatch(db);
        const isTrack = assignmentTarget.startsWith('track_');
        let courseIdsToAssign = [];
        let targetName = '';

        if (isTrack) {
            const trackId = assignmentTarget.replace('track_', '');
            const track = tracks.find(t => t.id === trackId);
            if (track) {
               courseIdsToAssign = track.requiredCourses;
               targetName = track.name;
            }
        } else {
            const courseId = assignmentTarget.replace('course_', '');
            courseIdsToAssign.push(courseId);
            const course = courses.find(c => c.id === courseId);
            if (course) targetName = course.title;
        }

        massAssignUsers.forEach(userId => {
            const user = users.find(u => u.id === userId);
            if (isTrack) {
                const trackId = assignmentTarget.replace('track_', '');
                const newTrackIds = [...new Set([...(user.trackIds || []), trackId])];
                batch.update(doc(db, 'users', userId), { trackIds: newTrackIds });
            }
            
            courseIdsToAssign.forEach(courseId => {
                const userCourseRef = doc(db, `users/${userId}/userCourseData`, courseId);
                batch.set(userCourseRef, {
                    dueDate: assignmentDueDate, status: 'in-progress', completedDate: null
                }, { merge: true });
            });
        });

        try {
            await batch.commit();
            setStatusMessage({ message: `Successfully assigned "${targetName}" to ${massAssignUsers.length} user(s).`, type: 'success', key: Date.now() });
            setMassAssignUsers([]);
            setAssignmentTarget('');
            setAssignmentDueDate('');
        } catch (error) {
            console.error("Error mass assigning:", error);
            setStatusMessage({ message: 'An error occurred during assignment.', type: 'error', key: Date.now() });
        }
    };

    const handleToggleMassAssignUser = (userId) => {
        setMassAssignUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
    };
     const handleTrackCourseSelection = (courseId) => {
        setNewTrackCourses(prev => prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]);
    };
    
    const inputBaseClasses = "w-full bg-neutral-100 dark:bg-neutral-700 p-2 rounded border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-white focus:ring-blue-500 focus:border-blue-500";
    
    return (
        <>
            {editingUser && <EditUserModal user={editingUser} onSave={handleSaveUser} onCancel={() => setEditingUser(null)} />}
            {editingTrack && <EditTrackModal track={editingTrack} courses={courses} onSave={handleSaveTrack} onCancel={() => setEditingTrack(null)} />}
            {editingCourse && <EditCourseModal course={editingCourse} onCancel={() => setEditingCourse(null)} setStatusMessage={setStatusMessage} />}
            {deletingItem && <ConfirmDeleteModal item={{...deletingItem.data, type: deletingItem.type}} onConfirm={handleDeleteItem} onCancel={() => setDeletingItem(null)} />}

            <div className="max-w-4xl mx-auto space-y-6">
                 {statusMessage.message && (
                    <div key={statusMessage.key} className={`text-center p-2 rounded-md text-sm transition-all duration-300 ${statusMessage.type === 'success' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' : statusMessage.type === 'error' ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'}`}>
                        {statusMessage.message}
                    </div>
                )}

                <CollapsibleCard title="Manage Employees">
                     <form onSubmit={handleCreateUser} className="space-y-3 mb-4 p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg">
                        <h4 className="font-semibold text-neutral-800 dark:text-white">Create New Employee</h4>
                        <input type="text" placeholder="New Employee Name" value={newUserName} onChange={e => setNewUserName(e.target.value)} required className={inputBaseClasses}/>
                        <input type="email" placeholder="Employee Email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} required className={inputBaseClasses}/>
                        <input type="password" placeholder="Password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} required className={inputBaseClasses}/>
                        <div className="flex items-center space-x-2 py-1">
                            <input type="checkbox" id="isAdminCheck" checked={newUserIsAdmin} onChange={e => setNewUserIsAdmin(e.target.checked)} className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 bg-neutral-100 dark:bg-neutral-700 dark:border-neutral-600"/>
                            <label htmlFor="isAdminCheck" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Is Admin?</label>
                        </div>
                        <button type="submit" className="w-full btn-primary text-white font-bold py-2 px-4 rounded">Create Employee</button>
                    </form>
                    <div className="border-t border-neutral-200 dark:border-neutral-700 pt-3">
                        <div className="h-48 overflow-y-auto space-y-1 pr-2">
                            {users.map(user => (
                                <div key={user.id} className="flex justify-between items-center p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700">
                                    <div>
                                        <p className="text-sm text-neutral-800 dark:text-neutral-200">{user.name}</p>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{user.email}</p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button onClick={() => handleResetPassword(user.email)} className="text-xs text-yellow-500 hover:underline">Reset Pass</button>
                                        <button onClick={() => setEditingUser(user)} className="text-xs text-blue-500 hover:underline">Edit</button>
                                        <button onClick={() => setDeletingItem({ type: 'user', data: user })} className="text-xs text-red-500 hover:underline">Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </CollapsibleCard>

                <CollapsibleCard title="Manage Courses & Paths">
                    <div className="mb-6">
                        <form onSubmit={handleCreateCourse} className="space-y-3 mb-4 p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg">
                            <h4 className="font-semibold text-neutral-800 dark:text-white">Create New Course</h4>
                            <input type="text" placeholder="Course Title (e.g., Andar Basics)" value={newCourseTitle} onChange={e => setNewCourseTitle(e.target.value)} required className={inputBaseClasses}/>
                            <input type="number" placeholder="Level (e.g., 101)" value={newCourseLevel} onChange={e => setNewCourseLevel(e.target.value)} required className={inputBaseClasses}/>
                            <button type="submit" className="w-full btn-primary text-white font-bold py-2 px-4 rounded">Create Course</button>
                        </form>
                        <div className="border-t border-neutral-200 dark:border-neutral-700 pt-3 h-48 overflow-y-auto space-y-1 pr-2">
                            {courses.map(course => (
                                <div key={course.id} className={`flex justify-between items-center p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 ${course.isArchived ? 'opacity-50' : ''}`}>
                                    <p className="text-sm text-neutral-800 dark:text-neutral-200">{course.title}</p>
                                    <div className="flex space-x-2">
                                        <button onClick={() => setEditingCourse(course)} className="text-xs text-blue-500 hover:underline">Edit</button>
                                        <button onClick={() => handleArchiveItem(course, 'course')} className="text-xs text-yellow-500 hover:underline">{course.isArchived ? 'Unarchive' : 'Archive'}</button>
                                        <button onClick={() => setDeletingItem({ type: 'course', data: course })} className="text-xs text-red-500 hover:underline">Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                     <div className="border-t-2 border-neutral-300 dark:border-neutral-700 pt-6">
                        <form onSubmit={handleCreateTrack} className="space-y-3 mb-4 p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg">
                            <h4 className="font-semibold text-neutral-800 dark:text-white">Create New Certification Path</h4>
                            <input type="text" placeholder="Path Name" value={newTrackName} onChange={e => setNewTrackName(e.target.value)} required className={inputBaseClasses}/>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="number" placeholder="Year" value={newTrackYear} onChange={e => setNewTrackYear(e.target.value)} required className={inputBaseClasses}/>
                                <div className="flex items-center space-x-2">
                                    <input type="text" placeholder="Font Awesome Icon (e.g., fa-star)" value={newTrackIcon} onChange={e => setNewTrackIcon(e.target.value)} required className={inputBaseClasses}/>
                                    <a href="https://fontawesome.com/icons" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" title="Browse Icons">
                                        <i className="fa-solid fa-external-link-alt"></i>
                                    </a>
                                </div>
                            </div>
                            <div>
                                 <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Required Courses</label>
                                 <div className="h-24 overflow-y-auto border border-neutral-300 dark:border-neutral-600 rounded p-2">
                                    {courses.filter(c => !c.isArchived).map(course => (
                                        <div key={course.id} className="flex items-center p-1">
                                            <input type="checkbox" id={`track-course-${course.id}`} checked={newTrackCourses.includes(course.id)} onChange={() => handleTrackCourseSelection(course.id)} className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 bg-neutral-100 dark:bg-neutral-700 dark:border-neutral-600 mr-2"/>
                                            <label htmlFor={`track-course-${course.id}`} className="text-sm text-neutral-800 dark:text-neutral-200">{course.title}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" className="w-full btn-primary text-white font-bold py-2 px-4 rounded">Create Path</button>
                        </form>
                        <div className="border-t border-neutral-200 dark:border-neutral-700 pt-3 h-48 overflow-y-auto space-y-1 pr-2">
                            {tracks.map(track => (
                                <div key={track.id} className={`flex justify-between items-center p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 ${track.isArchived ? 'opacity-50' : ''}`}>
                                    <p className="text-sm text-neutral-800 dark:text-neutral-200">{track.name}</p>
                                    <div className="flex space-x-2">
                                         <button onClick={() => setEditingTrack(track)} className="text-xs text-blue-500 hover:underline">Edit</button>
                                         <button onClick={() => handleArchiveItem(track, 'track')} className="text-xs text-yellow-500 hover:underline">{track.isArchived ? 'Unarchive' : 'Archive'}</button>
                                        <button onClick={() => setDeletingItem({ type: 'track', data: track })} className="text-xs text-red-500 hover:underline">Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </CollapsibleCard>

                <CollapsibleCard title="Assign & Remove Courses/Paths">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">1. Select a Course or Path</label>
                            <select value={assignmentTarget} onChange={e => setAssignmentTarget(e.target.value)} className={inputBaseClasses}>
                                <option value="" disabled>Select a target...</option>
                                <optgroup label="Certification Paths">
                                    {tracks.filter(t => !t.isArchived).map(t => <option key={t.id} value={`track_${t.id}`}>{t.name}</option>)}
                                </optgroup>
                                <optgroup label="Individual Courses">
                                    {courses.filter(c => !c.isArchived).map(c => <option key={c.id} value={`course_${c.id}`}>{c.title}</option>)}
                                </optgroup>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">2. Select Employees</label>
                            <div className="h-32 overflow-y-auto border border-neutral-300 dark:border-neutral-600 rounded p-2">
                                {users.map(user => (
                                    <div key={user.id} className="flex items-center p-1">
                                        <input type="checkbox" id={`mass-assign-${user.id}`} checked={massAssignUsers.includes(user.id)} onChange={() => handleToggleMassAssignUser(user.id)} className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 bg-neutral-100 dark:bg-neutral-700 dark:border-neutral-600 mr-2"/>
                                        <label htmlFor={`mass-assign-${user.id}`} className="text-sm text-neutral-800 dark:text-neutral-200">{user.name}</label>
                                    </div>
                                ))}
                            </div>
                            <div className="flex space-x-2 mt-2">
                                <button onClick={() => setMassAssignUsers(users.map(u => u.id))} className="text-xs btn-secondary text-white py-1 px-2 rounded w-full">Select All</button>
                                <button onClick={() => setMassAssignUsers([])} className="text-xs btn-secondary text-white py-1 px-2 rounded w-full">Unselect All</button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">3. Set Due Date (for assignments)</label>
                            <input type="date" value={assignmentDueDate} onChange={e => setAssignmentDueDate(e.target.value)} className={inputBaseClasses + ' dark:[color-scheme:dark]'} />
                        </div>
                        <div className="flex space-x-4">
                            <button onClick={handleMassAssign} className="w-full btn-primary text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center space-x-2 hover:bg-blue-700 transition-colors">
                                <i className="fa-solid fa-plus"></i>
                                <span>Assign ({massAssignUsers.length})</span>
                            </button>
                        </div>
                    </div>
                </CollapsibleCard>
            </div>
        </>
    );
};

ManagementTab.propTypes = {
    users: PropTypes.array.isRequired,
    courses: PropTypes.array.isRequired,
    tracks: PropTypes.array.isRequired,
};

export default ManagementTab;

