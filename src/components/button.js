import React from 'react';
import PropTypes from 'prop-types';

/**
 * A theme-aware button component that handles all styling internally.
 * It accepts a 'variant' prop to determine its appearance.
 */
const Button = ({ children, onClick, variant = 'primary', className = '', ...props }) => {
    // Base styles applied to all buttons
    const baseStyles = 'font-bold py-2 px-4 rounded-lg transition-all duration-300 ease-in-out focus:outline-none border';

    // A map of styles for each button variant
    const styles = {
        primary: `
            bg-white border-neutral-300 text-neutral-900 shadow-sm hover:shadow-md hover:shadow-blue-500/30
            dark:bg-neutral-800/60 dark:border-blue-500/50 dark:text-white dark:shadow-[0_0_15px_rgba(59,130,246,0.4)] dark:hover:shadow-[0_0_25px_rgba(59,130,246,0.7)] dark:hover:border-blue-500/90
        `,
        secondary: `
            bg-white border-neutral-300 text-neutral-800 shadow-sm hover:shadow-md hover:shadow-neutral-500/20
            dark:bg-neutral-700/50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700
        `,
        danger: `
            bg-white border-red-400 text-red-600 shadow-sm hover:shadow-md hover:shadow-red-500/30
            dark:bg-red-900/20 dark:border-red-500/50 dark:text-red-400 dark:hover:bg-red-800/40 dark:hover:text-white
        `
    };

    // Select the correct styles based on the variant prop
    const variantStyles = styles[variant] || styles.primary;

    return (
        <button
            onClick={onClick}
            className={`${baseStyles} ${variantStyles} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

Button.propTypes = {
    children: PropTypes.node.isRequired,
    onClick: PropTypes.func,
    variant: PropTypes.oneOf(['primary', 'secondary', 'danger']),
    className: PropTypes.string,
};

export default Button;
