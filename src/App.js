import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from './context/AuthContext';
import useTheme from './hooks/useTheme';
import { useCollection } from './hooks/useCollection';
import Header from './components/Header';
import OnboardingModal from './components/OnboardingModal';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load views
const LoginScreen = React.lazy(() => import('./views/auth/LoginScreen'));
const UserDashboard = React.lazy(() => import('./views/user/UserDashboard'));
const AdminDashboard = React.lazy(() => import('./views/admin/AdminDashboard'));
const QuestionView = React.lazy(() => import('./views/user/QuestionView'));

function App() {
    const { userData, loading: authLoading } = useAuth();
    const [currentView, setCurrentView] = useState('dashboard');
    const [takingCourseId, setTakingCourseId] = useState(null);
    const [theme, toggleTheme] = useTheme(userData); // Pass userData to the hook
    const [showOnboarding, setShowOnboarding] = useState(false);
    const { data: courses, loading: coursesLoading } = useCollection('courses', {
        skip: !userData
    });

    useEffect(() => {
        if (!authLoading && userData) {
             if (!sessionStorage.getItem('hasSeenTour')) {
                setShowOnboarding(true);
                sessionStorage.setItem('hasSeenTour', 'true');
            }
        }
    }, [userData, authLoading]);
    
    // The toggleTheme function now comes directly from the hook
    const handleStartCourse = (courseId) => setTakingCourseId(courseId);
    const handleExitCourse = () => setTakingCourseId(null);
    
    const handleLogout = async () => {
        handleExitCourse();
        const { auth } = await import('./firebase/config');
        const { signOut } = await import('firebase/auth');
        try {
            await signOut(auth);
            setCurrentView('dashboard');
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    useEffect(() => { 
        if (userData) { 
            setCurrentView('dashboard'); 
            handleExitCourse();
        } 
    }, [userData]);

    if (authLoading || coursesLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-white">Loading Application...</div>
    }

    if (!userData) {
        return (
            <div className={theme}>
                <div className="bg-neutral-100 dark:bg-neutral-900">
                    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
                        <LoginScreen />
                    </Suspense>
                </div>
            </div>
        );
    }
    
    const courseBeingTaken = takingCourseId ? courses.find(c => c.id === takingCourseId) : null;

    const renderMainContent = () => {
        if (courseBeingTaken) {
            return <QuestionView course={courseBeingTaken} user={userData} onBack={handleExitCourse} />;
        }
        if (userData.isAdmin && currentView === 'admin') {
            return <AdminDashboard />;
        }
        return <UserDashboard user={userData} onStartCourse={handleStartCourse} />;
    };

    return ( 
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 transition-colors">
            {showOnboarding && <OnboardingModal user={userData} onClose={() => setShowOnboarding(false)} />}
            <div className={showOnboarding ? 'blur-sm' : ''}>
                <Header 
                    user={userData} 
                    onLogout={handleLogout} 
                    onSwitchView={setCurrentView} 
                    theme={theme} 
                    toggleTheme={toggleTheme} 
                    currentView={currentView} 
                    onShowTour={() => setShowOnboarding(true)} 
                />
                <main>
                    <ErrorBoundary>
                        <Suspense fallback={<div className="p-8 text-center">Loading Page...</div>}>
                           {renderMainContent()}
                        </Suspense>
                    </ErrorBoundary>
                </main>
            </div>
        </div> 
    );
};

export default App;

