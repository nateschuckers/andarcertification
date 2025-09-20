import React, { useState } from 'react';
import PropTypes from 'prop-types';

const EditUserModal = ({ user, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
    });

    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSave = () => {
        onSave(user.id, formData);
    };

    const inputBaseClasses = "w-full mt-1 bg-neutral-100 dark:bg-neutral-700 p-2 rounded border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-white focus:ring-blue-500 focus:border-blue-500";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md dark:shadow-neutral-900 p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Edit: {user.name}</h2>
                    <button onClick={onCancel} className="text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white text-2xl">&times;</button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleFormChange} className={inputBaseClasses}/>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Email</label>
                        <input type="email" name="email" value={formData.email} onChange={handleFormChange} className={inputBaseClasses} disabled/>
                    </div>
                    <div className="flex items-center space-x-2">
                        <input type="checkbox" name="isAdmin" checked={formData.isAdmin} onChange={handleFormChange} id="editIsAdminCheck" className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 bg-neutral-100 dark:bg-neutral-700 dark:border-neutral-600"/>
                        <label htmlFor="editIsAdminCheck" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Is Admin?</label>
                    </div>
                </div>
                <div className="flex justify-end space-x-4 mt-6">
                    <button onClick={onCancel} className="btn-secondary text-white font-bold py-2 px-4 rounded">Cancel</button>
                    <button onClick={handleSave} className="btn-primary text-white font-bold py-2 px-4 rounded">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

EditUserModal.propTypes = {
    user: PropTypes.object.isRequired,
    onSave: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
};

export default EditUserModal;
