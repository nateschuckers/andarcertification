import { useState, useEffect } from 'react';

const useTheme = () => {
    const [theme, setTheme] = useState('dark');
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove(theme === 'dark' ? 'light' : 'dark');
        root.classList.add(theme);
    }, [theme]);
    return [theme, setTheme];
};

export default useTheme;

