// Function to determine the display status and color of a course based on its data
export const getCourseStatusInfo = (courseData) => {
    const SIMULATION_CURRENT_DATE = new Date(); // Use the real current date
    if (!courseData) return { text: 'Not Assigned', color: 'gray' };

    if (courseData.status === 'completed') {
        // Check if completedDate is a Firestore Timestamp and convert it
        let completedDate;
        if (courseData.completedDate && typeof courseData.completedDate.toDate === 'function') {
            completedDate = courseData.completedDate.toDate();
        } else if (courseData.completedDate) {
            completedDate = new Date(courseData.completedDate);
        }

        if (completedDate && !isNaN(completedDate)) {
             return { text: `Completed: ${completedDate.toLocaleDateString()}`, color: 'green' };
        }
        return { text: 'Completed', color: 'green' }; // Fallback if date is invalid
    }
    
    if (!courseData.dueDate) return { text: 'Not Started', color: 'gray' };
    
    const dueDate = new Date(courseData.dueDate + "T23:59:59Z");
    const daysRemaining = Math.ceil((dueDate - SIMULATION_CURRENT_DATE) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining < 0) return { text: 'Overdue', color: 'red' };
    if (daysRemaining <= 7) return { text: 'Due Soon', color: 'yellow' };
    
    return { text: 'In Progress', color: 'blue' };
};

// Function to format seconds into HH:MM:SS format
export const formatTime = (seconds) => {
    if (seconds === 0 || !seconds) return '00:00:00';
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
};

// Function to shuffle an array (Fisher-Yates algorithm)
export const shuffleArray = (array) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
};

