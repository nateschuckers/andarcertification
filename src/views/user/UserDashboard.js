import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { db } from '../../firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';
import { useCollection } from '../../hooks/useCollection';
import CourseCard from '../../components/CourseCard';
import CompletedTrackCard from '../../components/CompletedTrackCard';
import { formatTime } from '../../utils/helpers';

const UserDashboard = ({ user, onStartCourse }) => {
    const { data: courses, loading: coursesLoading } = useCollection('courses');
    const { data: tracks, loading: tracksLoading } = useCollection('tracks');
    const { data: users, loading: usersLoading } = useCollection('users');
    const [userCourseData, setUserCourseData] = useState({});
    const [userCourseDataLoading, setUserCourseDataLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(collection(db, `users/${user.id}/userCourseData`), (snapshot) => {
            const data = {};
            snapshot.forEach(doc => data[doc.id] = doc.data());
            setUserCourseData(data);
            setUserCourseDataLoading(false);
        });
        return () => unsub();
    }, [user.id]);

    const { data: activityLogs, loading: activityLogsLoading } = useCollection('activityLogs');

    const userTracksDetails = useMemo(() => {
        if (!user.trackIds || user.trackIds.length === 0 || !tracks.length) return [];
        return user.trackIds.map(tid => {
            const track = tracks.find(t => t.id === tid);
            if (!track) return null;
            const completedCourses = track.requiredCourses.filter(cid => userCourseData[cid]?.status === 'completed').length;
            const totalCourses = track.requiredCourses.length;
            const completionPercent = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 100;
            return { ...track, courses: track.requiredCourses.map(cid => courses.find(c => c.id === cid)).filter(Boolean), completionPercent, completedCourses, totalCourses, };
        }).filter(Boolean);
    }, [user.trackIds, userCourseData, tracks, courses]);

    const allRequiredCourseIds = useMemo(() => new Set((user.trackIds || []).flatMap(tid => tracks.find(t => t.id === tid)?.requiredCourses || [])), [user.trackIds, tracks]);
    const optionalCourses = useMemo(() => courses.filter(course => !allRequiredCourseIds.has(course.id)), [allRequiredCourseIds, courses]);
    const completedCourses = useMemo(() => Object.entries(userCourseData).filter(([_, data]) => data.status === 'completed').map(([courseId, _]) => courses.find(c => c.id === courseId)).filter(Boolean), [userCourseData, courses]);
    
    const completedTracks = useMemo(() => userTracksDetails.filter(t => t.completionPercent === 100), [userTracksDetails]);

     const leaderboardData = useMemo(() => {
        if (!users.length || !activityLogs.length) return [];
        return users
            .map(u => ({
                ...u,
                completedCount: (activityLogs.find(log => log.id === u.id)?.passes || 0)
            }))
            .sort((a, b) => b.completedCount - a.completedCount)
            .slice(0, 3);
    }, [users, activityLogs]);

    const userActivityLog = useMemo(() => activityLogs.find(log => log.id === user.id) || {}, [activityLogs, user.id]);

    const getTrophy = (index) => {
        if (index === 0) return <i className="fa-solid fa-trophy text-yellow-400"></i>;
        if (index === 1) return <i className="fa-solid fa-trophy text-gray-400"></i>;
        if (index === 2) return <i className="fa-solid fa-trophy text-amber-600"></i>;
        return null;
    }

    if (coursesLoading || tracksLoading || userCourseDataLoading || activityLogsLoading || usersLoading) {
        return <div className="p-8 text-center text-neutral-800 dark:text-white">Loading dashboard...</div>;
    }

    return ( 
        <div className="p-8"> 
            <h2 className="text-3xl font-bold mb-2 text-neutral-900 dark:text-white">Welcome, {user.name}!</h2> 
            <p className="text-neutral-500 dark:text-neutral-400 mb-8">Here is your certification progress.</p> 
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-10">
                    {userTracksDetails.length > 0 ? (
                        <div>
                            <h3 className="text-xl font-semibold mb-4 text-neutral-900 dark:text-white">Your Certification Paths</h3>
                            <div className="space-y-8">
                                {userTracksDetails.map(track => (
                                    <div key={track.id} className="bg-white dark:bg-neutral-800/50 p-6 rounded-lg">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="font-bold text-lg text-neutral-900 dark:text-white flex items-center">
                                                {track.icon && <i className={`fa ${track.icon} mr-3 text-blue-500`}></i>}
                                                <span>{track.name}</span>
                                            </h4>
                                            <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">{track.completedCourses}/{track.totalCourses} Courses Completed</span>
                                        </div>
                                        <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2.5 mb-4">
                                            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${track.completionPercent}%` }}></div>
                                        </div>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            {track.courses.map(course => <CourseCard key={course.id} course={course} courseData={userCourseData[course.id]} onStartCourse={onStartCourse} trackIcon={track.icon} />)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div> <h3 className="text-xl font-semibold mb-4 text-neutral-900 dark:text-white">Required Courses</h3> <p className="text-neutral-500 dark:text-neutral-400">You are not currently assigned to any certification paths.</p></div>
                    )}
                    
                    {optionalCourses.length > 0 && (
                        <div> 
                            <h3 className="text-xl font-semibold mb-4 text-neutral-900 dark:text-white">Optional Courses</h3> 
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {optionalCourses.map(course => <CourseCard key={course.id} course={course} courseData={userCourseData[course.id]} onStartCourse={onStartCourse} />)}
                            </div> 
                        </div>
                    )}
                </div> 
                <div className="md:col-span-1 space-y-6">
                    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">Your Stats</h3>
                    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md dark:shadow-neutral-900 p-4">
                        <p className="text-neutral-500 dark:text-neutral-400">Total Training Time</p>
                        <p className="text-2xl font-semibold text-neutral-900 dark:text-white">{formatTime(userActivityLog?.totalTrainingTime || 0)}</p>
                    </div>
                    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md dark:shadow-neutral-900 p-4">
                        <h4 className="font-bold text-lg mb-4 text-neutral-900 dark:text-white">Your Achievements</h4>
                        {completedTracks.length > 0 && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    {completedTracks.map(track => <CompletedTrackCard key={track.id} track={track} />)}
                                </div>
                                <hr className="my-4 border-neutral-200 dark:border-neutral-700"/>
                            </>
                        )}
                        <p className="text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">Course Badges ({completedCourses.length})</p>
                        <div className="grid grid-cols-4 gap-4 text-center">
                            {completedCourses.map(course => {
                                const courseTrack = tracks.find(t => t.requiredCourses.includes(course.id));
                                const icon = courseTrack ? courseTrack.icon : 'fa-star';
                                return (
                                    <div key={course.id} className="flex flex-col items-center" title={course.title}>
                                        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                                            <i className={`fa ${icon} text-blue-500 dark:text-blue-400 text-2xl`}></i>
                                        </div>
                                        <p className="text-xs mt-2 text-neutral-600 dark:text-neutral-400 truncate w-full">{course.title.split(':')[0]}</p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                     <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md dark:shadow-neutral-900 p-4">
                        <h4 className="font-bold text-lg mb-4 text-neutral-900 dark:text-white">Leaderboard</h4>
                        <ul className="space-y-3">
                            {leaderboardData.map((u, index) => (
                                <li key={u.id} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center">
                                       <span className="w-6 text-center">{getTrophy(index)}</span>
                                        <span className="ml-2 text-neutral-800 dark:text-neutral-200">{u.name}</span>
                                    </div>
                                    <span className="font-semibold text-neutral-500 dark:text-neutral-400">{u.completedCount}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div> 
            </div> 
        </div> 
    );
};

UserDashboard.propTypes = {
    user: PropTypes.object.isRequired,
    onStartCourse: PropTypes.func.isRequired
};

export default UserDashboard;

