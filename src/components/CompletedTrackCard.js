import React from 'react';
import PropTypes from 'prop-types';

const CompletedTrackCard = ({ track }) => (
    <div className="flex flex-col items-center text-center p-4 bg-green-50 dark:bg-green-900/50 rounded-lg border-2 border-green-500">
        <i className={`fa ${track.icon} text-green-500 text-4xl mb-2`}></i>
        <p className="font-bold text-sm text-neutral-800 dark:text-neutral-100">{track.name}</p>
        <p className="text-xs text-green-600 dark:text-green-400 font-semibold">Completed</p>
    </div>
);

CompletedTrackCard.propTypes = {
    track: PropTypes.object.isRequired,
};

export default CompletedTrackCard;
