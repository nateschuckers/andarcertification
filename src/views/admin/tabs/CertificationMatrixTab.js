import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { db } from '../../../firebase/config';
import { doc, writeBatch } from 'firebase/firestore';
import { getCourseStatusInfo } from '../../../utils/helpers';

// Modal for re-issuing courses/paths
const ReissueModal = ({ item, onConfirm, onCancel }) => {
    const [dueDate, setDueDate] = useState('');

    if (!item) return null;
    
    const inputClasses = "w-full mt-1 bg-neutral-100 dark:bg-neutral-700 p-2 rounded border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-white focus:ring-blue-500 focus:border-blue-500";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Re-issue {item.type}</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
                    You are about to re-issue the {item.type} <span className="font-semibold">{item.name}</span> for <span className="font-semibold">{item.userName}</span>. This will reset their completion status.
                </p>
                <div className="mt-4">
                    <label htmlFor="dueDate" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Set a new due date:</label>
                    <input type="date" id="dueDate" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputClasses + " dark:[color-scheme:dark]"} />
                </div>
                <div className="flex justify-end space-x-4 mt-6">
                    <button onClick={onCancel} className="btn-secondary text-white font-bold py-2 px-4 rounded">Cancel</button>
                    <button onClick={() => onConfirm(dueDate)} disabled={!dueDate} className="btn-primary text-white font-bold py-2 px-4 rounded disabled:bg-neutral-400">Confirm Re-issue</button>
                </div>
            </div>
        </div>
    );
};

ReissueModal.propTypes = {
    item: PropTypes.object,
    onConfirm: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
};


const CertificationMatrixTab = ({ users, tracks, courses, allUserCourseData }) => {
    const [expandedRowId, setExpandedRowId] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
    const [reissuingItem, setReissuingItem] = useState(null);

    const handleReissue = async (newDueDate) => {
        if (!reissuingItem || !newDueDate) return;

        const { type, userId, itemId } = reissuingItem;
        let courseIdsToUpdate = [];

        if (type === 'course') {
            courseIdsToUpdate.push(itemId);
        } else if (type === 'path') {
            const track = tracks.find(t => t.id === itemId);
            if (track) {
                courseIdsToUpdate = track.requiredCourses;
            }
        }
        
        if(courseIdsToUpdate.length === 0) {
            setReissuingItem(null);
            return;
        }

        try {
            const batch = writeBatch(db);
            courseIdsToUpdate.forEach(courseId => {
                const userCourseRef = doc(db, `users/${userId}/userCourseData`, courseId);
                batch.set(userCourseRef, {
                    status: 'in-progress',
                    completedDate: null,
                    failCount: 0,
                    attemptCount: 0,
                    dueDate: newDueDate
                }, { merge: true });
            });
            await batch.commit();
        } catch(error) {
            console.error("Error re-issuing:", error);
        } finally {
            setReissuingItem(null);
        }
    };

    const userStats = useMemo(() => {
        return users.map(user => {
            const userCourses = allUserCourseData[user.id] || {};
            const assignedTracks = (user.trackIds || []).map(tid => tracks.find(t => t.id === tid)).filter(Boolean);
            let totalCompletion = 0;
            let overallStatusPriority = 3;
            if (assignedTracks.length > 0) {
                assignedTracks.forEach(track => {
                    const { requiredCourses } = track;
                    const completed = requiredCourses.filter(id => userCourses[id]?.status === 'completed').length;
                    const completionPercent = requiredCourses.length > 0 ? Math.round((completed / requiredCourses.length) * 100) : 100;
                    totalCompletion += completionPercent;
                    let trackStatusPriority = 3;
                    requiredCourses.forEach(id => {
                        const status = getCourseStatusInfo(userCourses[id]);
                        if (status.color === 'red') trackStatusPriority = 1;
                        else if (status.color === 'yellow' && trackStatusPriority > 1) trackStatusPriority = 2;
                    });
                     if(trackStatusPriority < overallStatusPriority) overallStatusPriority = trackStatusPriority;
                });
            }
            const statusMap = {1: 'Overdue', 2: 'Warning', 3: 'On Track'};
            const overallStatusText = assignedTracks.length > 0 ? statusMap[overallStatusPriority] : 'N/A';
            const avgCompletion = assignedTracks.length > 0 ? Math.round(totalCompletion / assignedTracks.length) : null;
            const passedCount = Object.values(userCourses).filter(c => c.status === 'completed').length;
            return { ...user, assignedTracks, avgCompletion, coursesPassed: passedCount, status: overallStatusText, statusPriority: assignedTracks.length > 0 ? overallStatusPriority : 4 };
        });
    }, [users, tracks, allUserCourseData]);

    const atRiskUsers = useMemo(() => { 
        return userStats.filter(u => u.statusPriority < 3).map(user => { 
            const userCourses = allUserCourseData[user.id] || {}; 
            const flaggedCourses = user.assignedTracks.flatMap(track => track.requiredCourses.map(id => ({course: courses.find(c => c.id === id), status: getCourseStatusInfo(userCourses[id])}))).filter(c => c.course && (c.status.color === 'red' || c.status.color === 'yellow')); 
            return { user, flaggedCourses }; 
        }).filter(u => u.flaggedCourses.length > 0); 
    }, [userStats, courses, allUserCourseData]);
    
    const courseFailures = useMemo(() => {
        const failures = {};
        users.forEach(user => {
            const userCourseData = allUserCourseData[user.id] || {};
            Object.entries(userCourseData).forEach(([courseId, data]) => {
                if (data.failCount && data.failCount > 0) {
                    if (!failures[courseId]) {
                        failures[courseId] = { course: courses.find(c => c.id === courseId), totalFails: 0, users: [] };
                    }
                    failures[courseId].totalFails += data.failCount;
                    failures[courseId].users.push({ name: user.name, count: data.failCount });
                }
            });
        });
        return Object.values(failures).filter(f => f.course).sort((a, b) => b.totalFails - a.totalFails);
    }, [allUserCourseData, users, courses]);

    const sortedUsers = useMemo(() => { let sortableItems = [...userStats]; if (sortConfig !== null) { sortableItems.sort((a, b) => { if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1; if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1; return 0; }); } return sortableItems; }, [userStats, sortConfig]);
    const requestSort = (key) => { let direction = 'ascending'; if (sortConfig.key === key && sortConfig.direction === 'ascending') { direction = 'descending'; } setSortConfig({ key, direction }); };
    const getSortIcon = (key) => { if (sortConfig.key !== key) return <i className="fa-solid fa-sort ml-2 text-neutral-400"></i>; if (sortConfig.direction === 'ascending') return <i className="fa-solid fa-sort-up ml-2"></i>; return <i className="fa-solid fa-sort-down ml-2"></i>; };
    const StatusBadge = ({ text }) => { const colorMap = { 'Overdue': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300', 'Due Soon': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300', 'On Track': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300', 'N/A': 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300', 'Warning': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300', 'Completed': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300', 'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300', 'Not Started': 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300', 'Not Assigned': 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300',}; const statusText = text.startsWith('Completed') ? 'Completed' : text; return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorMap[statusText] || colorMap['N/A']}`}>{text}</span>; };
    
    // Sub-components defined inside the main component to have access to its scope (e.g., setReissuingItem)
    const UserDetailDrawer = ({ user }) => {
        const userCourseData = allUserCourseData[user.id] || {};
        const allRequiredCourseIds = user.assignedTracks.flatMap(t => t.requiredCourses);
        const optionalCoursesTaken = Object.keys(userCourseData).filter(id => !allRequiredCourseIds.includes(id)).map(id => courses.find(c => c.id === id)).filter(Boolean);

        return (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    {user.assignedTracks.map(track => {
                        const requiredCourses = track.requiredCourses.map(id => courses.find(c => c.id === id)).filter(Boolean);
                        return (
                            <div key={track.id} className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold text-neutral-900 dark:text-white">{track.name}</h4>
                                    <button onClick={() => setReissuingItem({ type: 'path', userId: user.id, userName: user.name, itemId: track.id, name: track.name })} className="text-xs text-blue-500 hover:underline">Re-issue Path</button>
                                </div>
                                {requiredCourses.length > 0 ? (
                                    <ul className="space-y-2">
                                        {requiredCourses.map(c => {
                                            const courseData = userCourseData[c.id];
                                            const dueDate = courseData?.dueDate;
                                            return (
                                                <li key={c.id} className="text-sm flex justify-between items-center text-neutral-700 dark:text-neutral-300">
                                                    <span className="truncate pr-2">{c.title}</span>
                                                    <div className="flex items-center space-x-2 flex-shrink-0">
                                                        {dueDate && <span className="text-xs text-neutral-500 dark:text-neutral-400">Due: {new Date(dueDate + "T23:59:59Z").toLocaleDateString()}</span>}
                                                        <StatusBadge text={getCourseStatusInfo(courseData).text} />
                                                        <button onClick={() => setReissuingItem({ type: 'course', userId: user.id, userName: user.name, itemId: c.id, name: c.title })} className="text-xs text-blue-500 hover:underline ml-2">Re-issue</button>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : <p className="text-sm text-neutral-500 dark:text-neutral-400">No required courses.</p>}
                            </div>
                        );
                    })}
                </div>
                 <div>
                    <h4 className="font-semibold text-neutral-900 dark:text-white mb-2">Optional Courses Taken</h4>
                    {optionalCoursesTaken.length > 0 ? (
                        <ul className="space-y-2">
                            {optionalCoursesTaken.map(c => {
                                const courseData = userCourseData[c.id];
                                const dueDate = courseData?.dueDate;
                                return (
                                    <li key={c.id} className="text-sm flex justify-between items-center text-neutral-700 dark:text-neutral-300">
                                        <span className="truncate pr-2">{c.title}</span>
                                        <div className="flex items-center space-x-2 flex-shrink-0">
                                            {dueDate && <span className="text-xs text-neutral-500 dark:text-neutral-400">Due: {new Date(dueDate + "T23:59:59Z").toLocaleDateString()}</span>}
                                            <StatusBadge text={getCourseStatusInfo(courseData).text} />
                                             <button onClick={() => setReissuingItem({ type: 'course', userId: user.id, userName: user.name, itemId: c.id, name: c.title })} className="text-xs text-blue-500 hover:underline ml-2">Re-issue</button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : <p className="text-sm text-neutral-500 dark:text-neutral-400">No optional courses taken.</p>}
                    <h4 className="font-semibold text-neutral-900 dark:text-white mb-2 mt-6">Admin Actions</h4>
                    <div className="flex space-x-2">
                        <a href={`mailto:${user.email}`} className="btn-secondary text-white text-xs px-3 py-1 rounded flex items-center"><i className="fa-solid fa-envelope mr-2"></i>Email User</a>
                    </div>
                </div>
            </div>
        );
    };

    const AtRiskUsersPanel = ({ users }) => { return (/* ...JSX... */) };
    const CourseFailuresPanel = ({ failures }) => { return (/* ...JSX... */) };
    
    // FIX: Main return statement is now correctly inside the component function
    return (
        <div>
            <ReissueModal item={reissuingItem} onConfirm={handleReissue} onCancel={() => setReissuingItem(null)} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <AtRiskUsersPanel users={atRiskUsers} />
                <CourseFailuresPanel failures={courseFailures} />
            </div>
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md dark:shadow-neutral-900 p-4">
                <h3 className="font-semibold mb-4 text-neutral-900 dark:text-white">All Users Matrix</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-neutral-100 dark:bg-neutral-800">
                            <tr className="text-neutral-600 dark:text-neutral-400">
                                <th className="p-3 font-semibold tracking-wider cursor-pointer" onClick={() => requestSort('name')}>Employee {getSortIcon('name')}</th>
                                <th className="p-3 font-semibold tracking-wider">Assigned Tracks</th>
                                <th className="p-3 font-semibold tracking-wider cursor-pointer" onClick={() => requestSort('avgCompletion')}>Avg Completion {getSortIcon('avgCompletion')}</th>
                                <th className="p-3 font-semibold tracking-wider cursor-pointer" onClick={() => requestSort('coursesPassed')}>Courses Passed {getSortIcon('coursesPassed')}</th>
                                <th className="p-3 font-semibold tracking-wider cursor-pointer" onClick={() => requestSort('statusPriority')}>Status {getSortIcon('statusPriority')}</th>
                                <th className="p-3 font-semibold tracking-wider"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                            {sortedUsers.map(user => (
                                <React.Fragment key={user.id}>
                                    <tr onClick={() => setExpandedRowId(expandedRowId === user.id ? null : user.id)} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer">
                                        <td className="p-3 font-semibold text-neutral-800 dark:text-white">{user.name}</td>
                                        <td className="p-3 text-neutral-600 dark:text-neutral-300">{user.assignedTracks.map(t => t.name).join(', ') || 'No Track'}</td>
                                        <td className="p-3 text-neutral-600 dark:text-neutral-300">{user.avgCompletion !== null ? `${user.avgCompletion}%` : 'N/A'}</td>
                                        <td className="p-3 text-neutral-600 dark:text-neutral-300">{user.coursesPassed}</td>
                                        <td className="p-3"><StatusBadge text={user.status} /></td>
                                        <td className="p-3 text-center text-neutral-500 dark:text-neutral-400"><i className={`fa-solid fa-chevron-down transition-transform ${expandedRowId === user.id ? 'rotate-180' : ''}`}></i></td>
                                    </tr>
                                    {expandedRowId === user.id && (
                                        <tr className="bg-neutral-50 dark:bg-neutral-900/50">
                                            <td colSpan="6" className="p-0"><UserDetailDrawer user={user} /></td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

CertificationMatrixTab.propTypes = {
    users: PropTypes.array.isRequired,
    tracks: PropTypes.array.isRequired,
    courses: PropTypes.array.isRequired,
    allUserCourseData: PropTypes.object.isRequired,
};

export default CertificationMatrixTab;

