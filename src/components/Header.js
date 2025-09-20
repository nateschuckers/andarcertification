import React from 'react';
import PropTypes from 'prop-types';
import ProfileMenu from './ProfileMenu';

const Header = ({ user, onLogout, onSwitchView, theme, toggleTheme, currentView, onShowTour }) => (
    <header className="bg-neutral-100 dark:bg-neutral-800 p-4 flex justify-between items-center border-b border-neutral-200 dark:border-neutral-700">
        <div>
            <img src="/assets/logo-light.png" alt="Company Logo" className="h-8 dark:hidden" />
            <img src="/assets/logo-dark.png" alt="Company Logo Dark" className="h-8 hidden dark:block" />
        </div>
        {user && (
            <div className="flex items-center space-x-4">
                <ProfileMenu 
                    user={user} 
                    onLogout={onLogout} 
                    onSwitchView={onSwitchView} 
                    theme={theme} 
                    toggleTheme={toggleTheme} 
                    currentView={currentView} 
                    onShowTour={onShowTour} 
                />
            </div>
        )}
    </header>
);

Header.propTypes = {
    user: PropTypes.object,
    onLogout: PropTypes.func,
    onSwitchView: PropTypes.func,
    theme: PropTypes.string,
    toggleTheme: PropTypes.func,
    currentView: PropTypes.string,
    onShowTour: PropTypes.func,
};

export default Header;

