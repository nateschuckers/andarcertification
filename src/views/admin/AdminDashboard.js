import React, { useState, useEffect, Suspense, lazy } from 'react';
import { collectionGroup, getDocs, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useCollection } from '../../hooks/useCollection';

// Lazy load the tabs for better performance
const CertificationMatrixTab = lazy(() => import('./tabs/CertificationMatrixTab'));
const UsageStatsTab = lazy(() => import('./tabs/UsageStatsTab'));
const ManagementTab = lazy(() => import('./tabs/ManagementTab'));
const QuestionGeneratorTab = lazy(() => import('./tabs/QuestionGeneratorTab'));


const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('matrix');
    const [dbError, setDbError] = useState(null);

    // Fetch primary collections
    const { data: users, loading: usersLoading } = useCollection('users');
    const { data: tracks, loading: tracksLoading } = useCollection('tracks');
    const { data: courses, loading: coursesLoading } = useCollection('courses');
    const { data: activityLogs, loading: activityLogsLoading } = useCollection('activityLogs');
    
    // State for the aggregated user course data
    const [allUserCourseData, setAllUserCourseData] = useState({});
    const [allUserCourseDataLoading, setAllUserCourseDataLoading] = useState(true);

    // Effect to fetch all `userCourseData` subcollections across all users
    useEffect(() => {
        const fetchAllUserCourseData = async () => {
            setDbError(null);
            setAllUserCourseDataLoading(true);
            try {
                // This query requires a composite index in Firestore. 
                // Firebase will provide a link in the console to create it if it's missing.
                const q = query(collectionGroup(db, 'userCourseData'));
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
        fetchAllUserCourseData();
    }, []);
    
    const isLoading = usersLoading || tracksLoading || coursesLoading || activityLogsLoading || allUserCourseDataLoading;

    const renderTabContent = () => {
        if (dbError) {
            return (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
                    <p className="font-bold">Database Error</p>
                    <p>The Admin Dashboard could not load all data due to a database configuration issue.</p>
                    <p className="mt-2 text-sm">
                        <b>Action Required:</b> This query requires a composite index. Please check the developer console for a link to create the necessary index in your Firebase console. The index may take a few minutes to build after creation.
                    </p>
                    <p className="mt-2 text-xs font-mono bg-red-200 p-2 rounded break-words"><b>Message:</b> {dbError.message}</p>
                </div>
            )
        }
        if (isLoading) return <div className="text-center p-8 text-neutral-800 dark:text-white">Loading Admin Data...</div>;
        
        const tabProps = { users, tracks, courses, allUserCourseData, activityLogs };

        switch(activeTab) {
            case 'matrix': return <CertificationMatrixTab {...tabProps} />;
            case 'usage': return <UsageStatsTab {...tabProps} />;
            case 'management': return <ManagementTab {...tabProps} />;
            case 'generator': return <QuestionGeneratorTab />;
            default: return null;
        }
    };

    const tabLabels = {'matrix': 'Certification Matrix', 'usage': 'Usage Stats', 'management': 'Management', 'generator': 'Question Generator'};
    
    return ( 
        <div className="p-4 md:p-8"> 
            <div className="flex justify-between items-center mb-6"> 
                <h2 className="text-3xl font-bold text-neutral-900 dark:text-white">Admin Dashboard</h2>
            </div> 
            <div className="flex space-x-1 mb-6 border-b border-neutral-200 dark:border-neutral-700 overflow-x-auto"> 
                {Object.keys(tabLabels).map(tab => ( 
                    <button 
                        key={tab} 
                        onClick={() => setActiveTab(tab)} 
                        className={`py-2 px-4 capitalize text-sm font-semibold transition-colors whitespace-nowrap ${activeTab === tab ? 'border-b-2 border-blue-500 text-blue-500' : 'text-neutral-500 dark:text-neutral-400 hover:text-blue-500'}`}
                    >
                        {tabLabels[tab]}
                    </button>
                ))} 
            </div> 
            <div className="p-1">
                <Suspense fallback={<div className="text-center p-8 text-neutral-800 dark:text-white">Loading Tab...</div>}>
                    {renderTabContent()}
                </Suspense>
            </div> 
        </div> 
    );
};

export default AdminDashboard;
