import React from 'react';
import PropTypes from 'prop-types';

const ConfirmDeleteModal = ({ item, onConfirm, onCancel }) => {
     return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md dark:shadow-neutral-900 p-6 w-full max-w-lg">
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Confirm Deletion</h2>
                <p className="text-neutral-600 dark:text-neutral-300 mt-2">
                    Are you sure you want to delete <span className="font-bold">{item.name || item.title}</span>? This action cannot be undone.
                </p>
                 {item.type === 'user' &&
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">Note: This will not delete the user's login account from Firebase Authentication. That must be done manually from the Firebase Console for security reasons.</p>
                 }
                <div className="flex justify-end space-x-4 mt-6">
                    <button onClick={onCancel} className="btn-secondary text-white font-bold py-2 px-4 rounded">Cancel</button>
                    <button onClick={onConfirm} className="btn-danger text-white font-bold py-2 px-4 rounded">Delete</button>
                </div>
            </div>
        </div>
    );
};

ConfirmDeleteModal.propTypes = {
    item: PropTypes.shape({
        name: PropTypes.string,
        title: PropTypes.string,
        type: PropTypes.string,
    }).isRequired,
    onConfirm: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
};

export default ConfirmDeleteModal;
