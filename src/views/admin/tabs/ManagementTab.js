import React, { useState, useEffect, useMemo } from 'react';
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

    const sortedUsers = useMemo(() => {
        return [...users].sort((a, b) => a.name.localeCompare(b.name));
    }, [users]);

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
                name: newUserName, email: newUserEmail, isAdmin: newUserIsAdmin, trackIds: [], themePreference: 'dark', hasSeenTour: false
            });
            await setDoc(doc(db, "activityLogs", newUser.uid), {
                logins: 0, lastLogin: null, totalTrainingTime: 0, attempts: 0, passes: 0, fails: 0, passRate: 0
            });
            setStatusMessage({ message: `Successfully created user ${newUserName}.`, type: 'success', key: Date.now() });
            setNewUserName(''); setNewUserEmail(''); setNewUserPassword(''); setNewUserIsAdmin(false);
        } catch (error) {
            console.error("Error creating user:",

