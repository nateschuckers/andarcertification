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
    getDocs,
    query
} from 'firebase/firestore';

import CollapsibleCard from '../../../components/CollapsibleCard';
import ConfirmDeleteModal from '../../../components/ConfirmDeleteModal';
import EditUserModal from './modals/EditUserModal';
import EditTrackModal from './modals/EditTrackModal';
import EditCourseModal from './modals/EditCourseModal';

// Confirmation Modal for clearing data
const ConfirmClearDataModal = ({ user, onConfirm, onCancel }) => {
    if (!user) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
                <h2 className="text-xl font-bold text-red-600 dark:text-red-400">Confirm Data Deletion</h2>
                <p className="text-neutral-600 dark:text-neutral-300 mt-2">
                    Are you sure you want to delete all course progress and activity logs for <span className="font-bold">{user.name}</span>? This action is permanent and cannot be undone.
                </p>
                <div className="flex justify-end space-x-4 mt-6">
                    <button onClick={onCancel} className="btn-secondary text-white font-bold py-2 px-4 rounded">Cancel</button>
                    <button onClick={onConfirm} className="btn-danger text-white font-bold py-2 px-4 rounded">Yes, Delete Data</button>
                </div>
            </div>
        </div>
    );
};

ConfirmClearDataModal.propTypes = {
    user: PropTypes.object,
    onConfirm: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
};


const ManagementTab = ({ users, courses, tracks }) => {
    const [editingUser, setEditingUser] = useState(null);
    const [editingCourse, setEditingCourse] = useState(null);
    const [editingTrack, setEditingTrack] = useState(null);
    const [deletingItem, setDeletingItem] = useState(null);
    const [clearingUser, setClearingUser] = useState(null);

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

    const [massAssignUsers, setMassAssignUsers] = useState([]);
    const [assignmentTarget, setAssignmentTarget] = useState('');
    const [assignmentDueDate, setAssignmentDueDate] = useState('');
    
    const [statusMessage, setStatusMessage] = useState({ message: '', type: 'neutral', key: 0 });

    useEffect(() => {
        if (statusMessage.message) {
            const timer = setTimeout(() => {
                setStatusMessage({ message: '', type: 'neutral', key: 0 });
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [statusMessage.key, statusMessage.message]);

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
                name: newUserName, email: newUserEmail, isAdmin: newUserIsAdmin, trackIds: [], themePreference: 'dark', hasSeenTour: false
            });
            await setDoc(doc(db, "activityLogs", newUser.uid), {
                logins: 0, lastLogin: null, totalTrainingTime: 0, attempts: 0, passes: 0, fails: 0, passRate: 0
            });
            setStatusMessage({ message: `Successfully created user ${newUserName}.`, type: 'success', key: Date.now() });
            setNewUserName(''); setNewUserEmail(''); setNewUserPassword(''); setNewUserIsAdmin(false);
        } catch (error) {
            console.error("Error creating user:", error);
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
    
    const handleConfirmClearData = async () => {
        if (!clearingUser) return;
        setStatusMessage({ message: `Clearing data for ${clearingUser.name}...`, type: 'info', key: Date.now() });
        try {
            const batch = writeBatch(db);
            const userCourseDataRef = collection(db, 'users', clearingUser.id, 'userCourseData');
            const userCourseDataSnapshot = await getDocs(query(userCourseDataRef));
            userCourseDataSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            const activityLogRef = doc(db, 'activityLogs', clearingUser.id);
            batch.set(activityLogRef, {
                attempts: 0, fails: 0, logins: 0, passRate: 0, passes: 0, totalTrainingTime: 0,
            }, { merge: true });
            const userRef = doc(db, 'users', clearingUser.id);
            batch.update(userRef, { trackIds: [] });
            await batch.commit();
            setStatusMessage({ message: `Successfully cleared all course data for ${clearingUser.name}.`, type: 'success', key: Date.now() });
        } catch (error) {
            console.error("Error clearing user data:", error);
            setStatusMessage({ message: `Error: ${error.message}`, type: 'error', key: Date.now() });
        } finally {
            setClearingUser(null);
            setEditingUser(null);
        }
    };

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        if (!newCourseTitle) return;
        try {
            await addDoc(collection(db, "courses"), {
                title: `${newCourseTitle} (${newCourseLevel})`, level: Number(newCourseLevel), quizLength: 1, type: 'standard', isArchived: false,
            });
            setStatusMessage({ message: 'Course created successfully.', type: 'success', key: Date.now() });
            setNewCourseTitle(''); setNewCourseLevel(101);
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
                name: newTrackName, year: Number(newTrackYear), icon: newTrackIcon, requiredCourses: newTrackCourses, isArchived: false,
            });
            setStatusMessage({ message: 'Certification Path created successfully.', type: 'success', key: Date.now() });
            setNewTrackName(''); setNewTrackYear(new Date().getFullYear()); setNewTrackIcon('fa-star'); setNewTrackCourses([]);
        } catch (error) {
            console.error("Error creating track:", error);
            setStatusMessage({ message: `Error: ${error.message}`, type: 'error', key: Date.now() });
        }
    };
    
    const handleSaveTrack = async (trackId, formData) => { /* ...omitted for brevity... */ };
    const handleArchiveItem = async (item, type) => { /* ...omitted for brevity... */ };
    const handleDeleteItem = async () => { /* ...omitted for brevity... */ };
    const handleResetPassword = async (email) => {
        if (!email) { setStatusMessage({ message: 'User email is not available.', type: 'error', key: Date.now() }); return; }
        try {
            await sendPasswordResetEmail(auth, email);
            setStatusMessage({ message: `Password reset email sent to ${email}.`, type: 'success', key: Date.now() });
        } catch (error) {
            console.error("Error sending password reset email:", error);
            setStatusMessage({ message: `Error: ${error.message}`, type: 'error', key: Date.now() });
        }
    };
    const handleMassAssign = async () => { /* ...omitted for brevity... */ };
    const handleToggleMassAssignUser = (userId) => { setMassAssignUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]); };
    const handleTrackCourseSelection = (courseId) => { setNewTrackCourses(prev => prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]); };

    const inputBaseClasses = "w-full bg-neutral-100 dark:bg-neutral-700 p-2 rounded border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-white focus:ring-blue-500 focus:border-blue-500";
    
    return (
        <>
            {editingUser && <EditUserModal user={editingUser} onSave={handleSaveUser} onCancel={() => setEditingUser(null)} onClearData={setClearingUser} />}
            {clearingUser && <ConfirmClearDataModal user={clearingUser} onConfirm={handleConfirmClearData} onCancel={() => setClearingUser(null)} />}
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
                        {/* ... rest of courses list ... */}
                    </div>
                     <div className="border-t-2 border-neutral-300 dark:border-neutral-700 pt-6">
                        <form onSubmit={handleCreateTrack} className="space-y-3 mb-4 p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg">
                           {/* ... form content ... */}
                        </form>
                        {/* ... rest of tracks list ... */}
                    </div>
                </CollapsibleCard>

                <CollapsibleCard title="Assign & Remove Courses/Paths">
                    <div className="space-y-4">
                        {/* ... assignment form ... */}
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

