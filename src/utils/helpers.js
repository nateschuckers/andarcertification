/**
 * Formats a given number of seconds into a HH:MM:SS string.
 * @param {number} seconds - The total seconds to format.
 * @returns {string} The formatted time string.
 */
export const formatTime = (seconds) => {
    if (seconds === 0 || !seconds) return '00:00:00';
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
};

/**
 * Shuffles an array in place and returns a new shuffled array.
 * @param {Array} array - The array to shuffle.
 * @returns {Array} A new array with the elements shuffled.
 */
export const shuffleArray = (array) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
};

/**
 * Determines the status of a course based on its due date and completion status.
 * @param {object} courseData - The user-specific data for a course.
 * @returns {object} An object containing the status text and color.
 */
export const getCourseStatusInfo = (courseData) => {
    const SIMULATION_CURRENT_DATE = new Date(); // Use real date for calculations
    if (!courseData) return { text: 'Not Assigned', color: 'gray' };
    if (courseData.status === 'completed') {
        const completedDate = courseData.completedDate ? new Date(courseData.completedDate).toLocaleDateString() : '';
        return { text: `Completed: ${completedDate}`, color: 'green' };
    }
    if (!courseData.dueDate) return { text: 'Not Started', color: 'gray' };
    
    // Ensure dueDate is treated as a UTC date to prevent off-by-one day errors
    const dueDate = new Date(courseData.dueDate + "T23:59:59Z"); 
    const daysRemaining = Math.ceil((dueDate - SIMULATION_CURRENT_DATE) / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) return { text: 'Overdue', color: 'red' };
    if (daysRemaining <= 7) return { text: 'Due Soon', color: 'yellow' };
    return { text: 'In Progress', color: 'blue' };
};
