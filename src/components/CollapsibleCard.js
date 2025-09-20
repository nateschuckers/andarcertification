import React, { useState } from 'react';
import PropTypes from 'prop-types';

const CollapsibleCard = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md dark:shadow-neutral-900">
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="w-full flex justify-between items-center p-4 text-left"
                aria-expanded={isOpen}
            >
                <h3 className="font-semibold text-neutral-900 dark:text-white">{title}</h3>
                <i className={`fa-solid fa-chevron-down text-neutral-500 dark:text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
            </button>
            {isOpen && (
                <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
                    {children}
                </div>
            )}
        </div>
    );
};

CollapsibleCard.propTypes = {
    title: PropTypes.string.isRequired,
    children: PropTypes.node.isRequired,
    defaultOpen: PropTypes.bool,
};

export default CollapsibleCard;
