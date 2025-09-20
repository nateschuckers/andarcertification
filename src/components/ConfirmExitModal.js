import React from 'react';
import PropTypes from 'prop-types';

const ConfirmExitModal = ({ onConfirm, onCancel }) => {
    const gifUrl = "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYzByMThtM2tnMms3NjFqcWY4MnQ4dm5qZ29idHY5ZTIzcjl2czV1biZlcD12MV9naWZzX3NlYXJjaCZjdD1n/pICj6JWqVpm5aapOIS/giphy.gif";
    const message = "Are you sure? Your progress on this attempt will be lost!";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="relative text-center p-8 rounded-lg max-w-sm w-full">
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-yellow-500 flex items-center justify-center text-white text-3xl">
                    <i className="fa fa-exclamation-triangle"></i>
                </div>
                <div className="bg-neutral-100 dark:bg-neutral-800 p-6 pt-12 rounded-lg shadow-2xl">
                    <img src={gifUrl} alt="Warning: Are you sure?" className="w-full h-48 object-contain rounded-lg mb-4" />
                    <p className="text-xl font-bold text-yellow-500 mb-6">{message}</p>
                    <div className="flex space-x-4">
                        <button 
                            onClick={onCancel} 
                            className="w-full btn-secondary text-white font-bold py-3 px-6 rounded-lg shadow-md hover:scale-105 hover:shadow-lg transition-all duration-300 ease-in-out">
                            Keep going
                        </button>
                        <button 
                            onClick={onConfirm} 
                            className="w-full btn-danger text-white font-bold py-3 px-6 rounded-lg shadow-md hover:scale-105 hover:shadow-lg transition-all duration-300 ease-in-out">
                            Exit Course
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

ConfirmExitModal.propTypes = {
    onConfirm: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
};

export default ConfirmExitModal;
