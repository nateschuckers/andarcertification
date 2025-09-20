import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';

const useTheme = (user) => {
    // Set initial theme based on user data, or default to 'dark'
    const [theme, setTheme] = useState('dark');

    // Effect to apply the theme class to the document when the theme state changes
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove(theme === 'dark' ? 'light' : 'dark');
        root.classList.add(theme);
    }, [theme]);

    // Effect to set the theme from user's preference when they log in
    useEffect(() => {
        if (user?.themePreference) {
            setTheme(user.themePreference);
        } else {
            setTheme('dark'); // Default for users without a preference set
        }
    }, [user]);

    // Function to toggle the theme and save the preference to Firestore
    const toggleTheme = async () => {
        if (!user || !user.id) return; // Guard against toggling when logged out

        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme); // Update the UI optimistically

        try {
            const userDocRef = doc(db, 'users', user.id);
            await updateDoc(userDocRef, {
                themePreference: newTheme
            });
        } catch (error) {
            console.error("Error updating theme:", error);
            // Optional: Revert theme state if the database update fails
            setTheme(theme); 
        }
    };

    return [theme, toggleTheme];
};

export default useTheme;

