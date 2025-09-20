import React, { useState, useEffect } from 'react';
import { collectionGroup, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useCollection } from '../../hooks/useCollection';
import CertificationMatrixTab from './tabs/CertificationMatrixTab';
import UsageStatsTab from './tabs/UsageStatsTab';
import ManagementTab from './tabs/ManagementTab';
import QuestionGeneratorTab from './tabs/QuestionGeneratorTab';
import FeedbackTab from './tabs/FeedbackTab'; // Import the new tab

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('matrix');
    const [dbError, setDbError] = useState(null);

    // Use custom hook to fetch collections
    const { data: users, loading: usersLoading } = useCollection('users');
    const { data: tracks, loading: tracksLoading } = useCollection('tracks');
    const { data: courses, loading: coursesLoading } = useCollection('courses');
    const { data: activityLogs, loading: activityLogsLoading } = useCollection('activityLogs');

    const [allUserCourseData, setAllUserCourseData] = useState({});
    const [allUserCourseDataLoading, setAllUserCourseDataLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            setDbError(null);
            setAllUserCourseDataLoading(true);
            try {
                const q = collectionGroup(db, 'userCourseData');
                const querySnapshot = await getDocs(q);
                const allData = {};
                querySnapshot.forEach((doc) => {
                    const path = doc.ref.path.split('/');
                    const userId = path[1];
                    const courseId = doc.id;
                    if (!allData[userId]) {
                        allData[userId] = {};
                    }
                    allData[userId][courseId] = doc.data();
                });
                setAllUserCourseData(allData);
            } catch (error) {
                 console.error("Error fetching all user course data:", error);
                 setDbError(error);
            } finally {
                setAllUserCourseDataLoading(false);
            }
        };
        fetchAll();
    }, []);
    
    const isLoading = usersLoading || tracksLoading || coursesLoading || activityLogsLoading || allUserCourseDataLoading;

    const renderTabContent = () => {
         if (dbError) {
            return (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
                    <p className="font-bold">Database Error</p>
                    <p>The Admin Dashboard could not load all data due to a database configuration issue.</p>
                    <p className="mt-2 text-sm">
                        <b>Action Required:</b> The query requires a composite index. Please click the link in the developer console to create it in your Firebase console. It may take a few minutes to build.
                    </p>
                     <p className="mt-2 text-xs break-words">If you do not see a link, you may have already created the index, or your security rules may be incorrect.</p>
                    <p className="mt-2 text-xs font-mono bg-red-200 p-2 rounded break-words"><b>Message:</b> {dbError.message}</p>
                </div>
            )
        }
        if (isLoading) return <div className="text-center p-8 text-neutral-800 dark:text-white">Loading Admin Data...</div>;
        
        switch(activeTab) {
            case 'matrix': return <CertificationMatrixTab users={users} tracks={tracks} courses={courses} allUserCourseData={allUserCourseData} />;
            case 'usage': return <UsageStatsTab users={users} courses={courses} activityLogs={activityLogs} />;
            case 'management': return <ManagementTab users={users} courses={courses} tracks={tracks} />;
            case 'generator': return <QuestionGeneratorTab />;
            case 'feedback': return <FeedbackTab />; // Add case for the new tab
            default: return null;
        }
    };
    // Add new tab label
    const tabLabels = {'matrix': 'Certification Matrix', 'usage': 'Usage Stats', 'management': 'Management', 'generator': 'Question Generator', 'feedback': 'Feedback Content'};
    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-neutral-900 dark:text-white">Admin Dashboard</h2>
            </div>
            <div className="flex space-x-1 mb-6 border-b border-neutral-200 dark:border-neutral-700">
                {Object.keys(tabLabels).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`py-2 px-4 capitalize text-sm font-semibold transition-colors ${activeTab === tab ? 'border-b-2 border-blue-500 text-blue-500' : 'text-neutral-500 dark:text-neutral-400 hover:text-blue-500'}`}>
                        {tabLabels[tab]}
                    </button>
                ))}
            </div>
            <div className="p-1">{renderTabContent()}</div>
        </div>
    );
};

export default AdminDashboard;

