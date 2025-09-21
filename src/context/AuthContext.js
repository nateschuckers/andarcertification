import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            if (user) {
                // When user logs in, update their activity log
                const activityLogRef = doc(db, 'activityLogs', user.uid);
                try {
                    await runTransaction(db, async (transaction) => {
                        const activityLogDoc = await transaction.get(activityLogRef);
                        const newLogins = (activityLogDoc.data()?.logins || 0) + 1;
                        transaction.set(activityLogRef, { 
                            logins: newLogins,
                            lastLogin: serverTimestamp() 
                        }, { merge: true });
                    });
                } catch (error) {
                    console.error("Failed to update login stats:", error);
                }

                // Set up the listener for the user's profile data
                const userDocRef = doc(db, "users", user.uid);
                const unsubscribeDoc = onSnapshot(userDocRef, (doc) => {
                     if (doc.exists()) {
                        setUserData({ id: doc.id, ...doc.data() });
                    } else {
                        setUserData(null); // User auth exists but no profile doc
                    }
                    setLoading(false);
                });
                return () => unsubscribeDoc(); // Cleanup the profile listener
            } else {
                // User is signed out
                setUserData(null);
                setLoading(false);
            }
        });
        return () => unsubscribe(); // Cleanup the auth state listener
    }, []);

    const value = { user, userData, loading };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    return useContext(AuthContext);
};

