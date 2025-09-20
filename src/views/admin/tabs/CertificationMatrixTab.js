import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { getCourseStatusInfo } from '../../../utils/helpers';

// --- Sub-components specific to this tab ---

const StatusBadge = ({ text }) => {
    // Standardize text for mapping, e.g., "Completed: 9/20/2025" -> "Completed"
    const statusText = text.startsWith('Completed') ? 'Completed' : text;
    const colorMap = {
        'Overdue': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        'Due Soon': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        'On Track': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        'Warning': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        'Completed': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        'Not Started': 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300',
        'Not Assigned': 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300',
        'N/A': 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300',
    };
    const badgeClass = colorMap[statusText] || colorMap['N/A'];
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${badgeClass}`}>{text}</span>;
};
StatusBadge.propTypes = { text: PropTypes.string.isRequired };


const UserDetailDrawer = ({ user, allUserCourseData, courses }) => {
    const userCourseData = allUserCourseData[user.id] || {};
    const allRequiredCourseIds = user.assignedTracks.flatMap(t => t.requiredCourses);
    const optionalCoursesTaken = Object.keys(userCourseData)
        .filter(id => !allRequiredCourseIds.includes(id))
        .map(id => courses.find(c => c.id === id))
        .filter(Boolean);

    return (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                {user.assignedTracks.map(track => {
                    const requiredCourses = track.requiredCourses.map(id => courses.find(c => c.id === id)).filter(Boolean);
                    return (
                        <div key={track.id} className="mb-4">
                            <h4 className="font-semibold text-neutral-900 dark:text-white mb-2">{track.name}</h4>
                            {requiredCourses.length > 0 ? (
                                <ul className="space-y-2">
                                    {requiredCourses.map(c => (
                                        <li key={c.id} className="text-sm flex justify-between items-center text-neutral-700 dark:text-neutral-300">
                                            <span>{c.title}</span>
                                            <StatusBadge text={getCourseStatusInfo(userCourseData[c.id]).text} />
                                        </li>
                                    ))}
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
                        {optionalCoursesTaken.map(c => (
                            <li key={c.id} className="text-sm flex justify-between items-center text-neutral-700 dark:text-neutral-300">
                                <span>{c.title}</span>
                                <StatusBadge text={getCourseStatusInfo(userCourseData[c.id]).text} />
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-sm text-neutral-500 dark:text-neutral-400">No optional courses taken.</p>}
                
                <h4 className="font-semibold text-neutral-900 dark:text-white mb-2 mt-6">Admin Actions</h4>
                <div className="flex space-x-2">
                    <a href={`mailto:${user.email}`} className="btn-secondary text-white text-xs px-3 py-1 rounded flex items-center">
                        <i className="fa-solid fa-envelope mr-2"></i>Email User
                    </a>
                </div>
            </div>
        </div>
    );
};
UserDetailDrawer.propTypes = { 
    user: PropTypes.object.isRequired, 
    allUserCourseData: PropTypes.object.isRequired,
    courses: PropTypes.array.isRequired
};


const AtRiskUsersPanel = ({ users, allUserCourseData, courses }) => {
    const atRiskUsers = useMemo(() => {
        return users
            .filter(u => u.statusPriority < 3) // Filter for 'Overdue' or 'Warning'
            .map(user => {
                const userCourses = allUserCourseData[user.id] || {};
                const flaggedCourses = user.assignedTracks
                    .flatMap(track => track.requiredCourses.map(id => ({
                        course: courses.find(c => c.id === id),
                        status: getCourseStatusInfo(userCourses[id])
                    })))
                    .filter(c => c.course && (c.status.color === 'red' || c.status.color === 'yellow'));
                return { user, flaggedCourses };
            })
            .filter(u => u.flaggedCourses.length > 0);
    }, [users, allUserCourseData, courses]);

    if (atRiskUsers.length === 0) return null;

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md dark:shadow-neutral-900 p-4 mb-6">
            <h3 className="font-semibold mb-4 text-yellow-600 dark:text-yellow-400"><i className="fa-solid fa-triangle-exclamation mr-2"></i>Users Needing Attention</h3>
            <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {atRiskUsers.map(({ user, flaggedCourses }) => (
                    <div key={user.id} className="py-3 flex justify-between items-center">
                        <div>
                            <p className="font-semibold text-neutral-800 dark:text-white">{user.name}</p>
                            <ul className="mt-1 space-y-1">
                                {flaggedCourses.map(({ course, status }) => (
                                    <li key={course.id} className="text-xs text-neutral-500 dark:text-neutral-400 ml-4 flex items-center">
                                        <StatusBadge text={status.text} />
                                        <span className="ml-2">{course.title}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <a href={`mailto:${user.email}`} className="btn-secondary text-white text-xs px-3 py-1 rounded flex items-center">
                            <i className="fa-solid fa-envelope mr-2"></i>Remind
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
};
AtRiskUsersPanel.propTypes = { 
    users: PropTypes.array.isRequired, 
    allUserCourseData: PropTypes.object.isRequired,
    courses: PropTypes.array.isRequired
};


// --- Main Tab Component ---

const CertificationMatrixTab = ({ users, tracks, courses, allUserCourseData }) => {
    const [expandedRowId, setExpandedRowId] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });

    const userStats = useMemo(() => {
        return users.map(user => {
            const userCourses = allUserCourseData[user.id] || {};
            const assignedTracks = (user.trackIds || []).map(tid => tracks.find(t => t.id === tid)).filter(Boolean);
            
            let totalCompletion = 0;
            let overallStatusPriority = 3; // 3: On Track, 2: Warning, 1: Overdue
            
            if (assignedTracks.length > 0) {
                assignedTracks.forEach(track => {
                    const { requiredCourses } = track;
                    const completed = requiredCourses.filter(id => userCourses[id]?.status === 'completed').length;
                    const completionPercent = requiredCourses.length > 0 ? Math.round((completed / requiredCourses.length) * 100) : 100;
                    totalCompletion += completionPercent;

                    let trackStatusPriority = 3;
                    requiredCourses.forEach(id => {
                        const status = getCourseStatusInfo(userCourses[id]);
                        if (status.color === 'red') trackStatusPriority = 1; // Overdue is highest priority
                        else if (status.color === 'yellow' && trackStatusPriority > 1) trackStatusPriority = 2; // Warning
                    });
                     if(trackStatusPriority < overallStatusPriority) overallStatusPriority = trackStatusPriority;
                });
            }

            const statusMap = {1: 'Overdue', 2: 'Warning', 3: 'On Track'};
            const overallStatusText = assignedTracks.length > 0 ? statusMap[overallStatusPriority] : 'N/A';
            const avgCompletion = assignedTracks.length > 0 ? Math.round(totalCompletion / assignedTracks.length) : null;
            const passedCount = Object.values(userCourses).filter(c => c.status === 'completed').length;

            return { 
                ...user, 
                assignedTracks, 
                avgCompletion, 
                coursesPassed: passedCount, 
                status: overallStatusText, 
                statusPriority: assignedTracks.length > 0 ? overallStatusPriority : 4 // 4 for N/A
            };
        });
    }, [users, tracks, allUserCourseData]);

    const sortedUsers = useMemo(() => {
        let sortableItems = [...userStats];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                const valA = a[sortConfig.key] ?? (sortConfig.direction === 'ascending' ? Infinity : -Infinity);
                const valB = b[sortConfig.key] ?? (sortConfig.direction === 'ascending' ? Infinity : -Infinity);
                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [userStats, sortConfig]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <i className="fa-solid fa-sort ml-2 text-neutral-400"></i>;
        if (sortConfig.direction === 'ascending') return <i className="fa-solid fa-sort-up ml-2"></i>;
        return <i className="fa-solid fa-sort-down ml-2"></i>;
    };
    
    return (
        <div>
            <AtRiskUsersPanel users={userStats} allUserCourseData={allUserCourseData} courses={courses} />
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
                                        <td className="p-3 text-center text-neutral-500 dark:text-neutral-400">
                                            <i className={`fa-solid fa-chevron-down transition-transform ${expandedRowId === user.id ? 'rotate-180' : ''}`}></i>
                                        </td>
                                    </tr>
                                    {expandedRowId === user.id && (
                                        <tr className="bg-neutral-50 dark:bg-neutral-900/50">
                                            <td colSpan="6" className="p-0">
                                                <UserDetailDrawer user={user} allUserCourseData={allUserCourseData} courses={courses} />
                                            </td>
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
