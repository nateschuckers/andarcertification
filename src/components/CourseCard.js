import React from 'react';
import PropTypes from 'prop-types';
import { getCourseStatusInfo } from '../utils/helpers';

const CourseCard = ({ course, courseData, onStartCourse, trackIcon }) => {
    const getStatus = () => {
        const statusInfo = getCourseStatusInfo(courseData);
        const colorMap = {
            red: 'border-red-500 text-red-600 dark:text-red-400',
            yellow: 'border-yellow-500 text-yellow-600 dark:text-yellow-400',
            green: 'border-green-500 text-green-600 dark:text-green-400',
            gray: 'border-neutral-300 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400',
            blue: 'border-blue-500 text-blue-600 dark:text-blue-400',
        };
        const statusClass = colorMap[statusInfo.color] || colorMap.gray;
        return {
            borderColor: statusClass.split(' ')[0],
            textColor: statusClass.split(' ').slice(1).join(' '),
            text: statusInfo.text,
            subText: courseData?.dueDate && statusInfo.color !== 'green' ? `Due: ${new Date(courseData.dueDate + "T23:59:59Z").toLocaleDateString()}` : ''
        };
    };

    const styles = getStatus();

    return (
        <div onClick={() => onStartCourse(course.id)} className={`bg-white dark:bg-neutral-800 rounded-lg shadow-md dark:shadow-neutral-900 p-4 border-l-4 ${styles.borderColor} cursor-pointer hover:shadow-lg dark:hover:bg-neutral-700 transition-all`}>
            <div className="flex items-center">
                {trackIcon && <i className={`fa ${trackIcon} mr-3 text-neutral-400 dark:text-neutral-500`}></i>}
                <h3 className="font-bold text-lg text-neutral-900 dark:text-white">{course.title}</h3>
            </div>
            <p className={`text-sm font-semibold ${styles.textColor} mt-2`}>{styles.text}</p>
            {styles.subText && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{styles.subText}</p>}
        </div>
    );
};

CourseCard.propTypes = {
    course: PropTypes.object.isRequired,
    courseData: PropTypes.object,
    onStartCourse: PropTypes.func.isRequired,
    trackIcon: PropTypes.string
};

export default CourseCard;

