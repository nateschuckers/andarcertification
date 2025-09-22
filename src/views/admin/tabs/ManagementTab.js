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

// New Confirmation Modal for clearing data
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
    // ... existing state ...
    const [editingUser, setEditingUser] = useState(null);
    const [deletingItem, setDeletingItem] = useState(null);
    const [clearingUser, setClearingUser] = useState(null); // State for the new modal

    // ... existing state ...
    
    useEffect(() => {
        // ... existing useEffect ...
    }, [statusMessage.key, statusMessage.message]);

    // --- Handlers for CRUD operations ---

    const handleCreateUser = async (e) => { /* ... existing handleCreateUser logic ... */ };
    const handleCreateCourse = async (e) => { /* ... existing handleCreateCourse logic ... */ };
    const handleCreateTrack = async (e) => { /* ... existing handleCreateTrack logic ... */ };
    const handleSaveUser = async (userId, formData) => { /* ... existing handleSaveUser logic ... */ };
    const handleSaveTrack = async (trackId, formData) => { /* ... existing handleSaveTrack logic ... */ };
    const handleArchiveItem = async (item, type) => { /* ... existing handleArchiveItem logic ... */ };
    const handleDeleteItem = async () => { /* ... existing handleDeleteItem logic ... */ };
    const handleResetPassword = async (email) => { /* ... existing handleResetPassword logic ... */ };
    const handleMassAssign = async () => { /* ... existing handleMassAssign logic ... */ };
    
    // New handler to clear a user's course data
    const handleConfirmClearData = async () => {
        if (!clearingUser) return;
        
        setStatusMessage({ message: `Clearing data for ${clearingUser.name}...`, type: 'info', key: Date.now() });

        try {
            const batch = writeBatch(db);

            // 1. Delete all documents in the userCourseData subcollection
            const userCourseDataRef = collection(db, 'users', clearingUser.id, 'userCourseData');
            const userCourseDataSnapshot = await getDocs(query(userCourseDataRef));
            userCourseDataSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            // 2. Reset the activity log for the user
            const activityLogRef = doc(db, 'activityLogs', clearingUser.id);
            batch.set(activityLogRef, {
                attempts: 0,
                fails: 0,
                logins: 0,
                passRate: 0,
                passes: 0,
                totalTrainingTime: 0,
            }, { merge: true }); // Use merge to avoid overwriting lastLogin if you want to keep it

            // 3. Optional: Reset assigned tracks on the user object
            const userRef = doc(db, 'users', clearingUser.id);
            batch.update(userRef, { trackIds: [] });

            await batch.commit();

            setStatusMessage({ message: `Successfully cleared all course data for ${clearingUser.name}.`, type: 'success', key: Date.now() });
        } catch (error) {
            console.error("Error clearing user data:", error);
            setStatusMessage({ message: `Error: ${error.message}`, type: 'error', key: Date.now() });
        } finally {
            setClearingUser(null);
            setEditingUser(null); // Close the edit modal as well
        }
    };
    
    const handleToggleMassAssignUser = (userId) => { /* ... existing handleToggleMassAssignUser logic ... */ };
    const handleTrackCourseSelection = (courseId) => { /* ... existing handleTrackCourseSelection logic ... */ };
    
    const inputBaseClasses = "w-full bg-neutral-100 dark:bg-neutral-700 p-2 rounded border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-white focus:ring-blue-500 focus:border-blue-500";
    
    return (
        <>
            {editingUser && <EditUserModal user={editingUser} onSave={handleSaveUser} onCancel={() => setEditingUser(null)} onClearData={setClearingUser} />}
            {clearingUser && <ConfirmClearDataModal user={clearingUser} onConfirm={handleConfirmClearData} onCancel={() => setClearingUser(null)} />}
            
            {/* ... other modals ... */}
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
                     {/* ... existing employee creation form ... */}
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

                {/* ... other collapsible cards ... */}
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

