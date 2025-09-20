import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

const ProfileMenu = ({ user, onLogout, onSwitchView, theme, toggleTheme, currentView, onShowTour }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuRef]);

    const handleSwitchView = (view) => {
        onSwitchView(view);
        setIsOpen(false);
    };
    
    const dynamicAdminButton = user.isAdmin ? (
        currentView === 'admin' ? (
             <button onClick={() => handleSwitchView('dashboard')} className="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center">
                <i className="fa fa-th-large w-6 text-center"></i> My Dashboard
            </button>
        ) : (
            <button onClick={() => handleSwitchView('admin')} className="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center">
                <i className="fa fa-shield-halved w-6 text-center"></i> Admin Dashboard
            </button>
        )
    ) : null;

    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="w-9 h-9 bg-neutral-200 dark:bg-neutral-700 rounded-full flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors">
                <i className="fa fa-user"></i>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 z-10">
                    <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
                        <p className="font-semibold text-neutral-800 dark:text-neutral-100">{user.name}</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">{user.email}</p>
                    </div>
                    <div className="py-2">
                        {dynamicAdminButton}
                        <button onClick={() => { onShowTour(); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center">
                            <i className="fa fa-info-circle w-6 text-center"></i> Show Tour
                        </button>
                        <button onClick={toggleTheme} className="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center justify-between">
                            <span><i className={`fa ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} w-6 text-center`}></i> Theme</span>
                            <span className="text-xs text-neutral-400">{theme === 'dark' ? 'Light' : 'Dark'}</span>
                        </button>
                    </div>
                    <div className="p-2">
                        <button onClick={onLogout} className="w-full btn-danger text-white font-bold py-2 px-3 rounded text-sm flex items-center justify-center">
                            <i className="fa fa-right-from-bracket mr-2"></i> Logout
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

ProfileMenu.propTypes = {
    user: PropTypes.object.isRequired,
    onLogout: PropTypes.func.isRequired,
    onSwitchView: PropTypes.func.isRequired,
    theme: PropTypes.string.isRequired,
    toggleTheme: PropTypes.func.isRequired,
    currentView: PropTypes.string.isRequired,
    onShowTour: PropTypes.func.isRequired,
};

export default ProfileMenu;
