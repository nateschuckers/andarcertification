import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, onSnapshot } from 'firebase/firestore';

export const useCollection = (collectionName, options = {}) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (options.skip) {
            setLoading(false);
            return;
        }

        const q = query(collection(db, collectionName));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const items = [];
            querySnapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() });
            });
            setData(items);
            setLoading(false);
        }, (err) => {
            console.error(`Error fetching collection: ${collectionName}`, err);
            setError(err);
            setLoading(false);
        });

        // Unsubscribe on unmount
        return () => unsubscribe();
    }, [collectionName, options.skip]); // Dependency array

    return { data, loading, error };
};

