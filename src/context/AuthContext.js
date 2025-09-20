import React, { useContext, useState, useEffect, createContext } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from '../firebase/config';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            if (user) {
                const userDocRef = doc(db, "users", user.uid);
                const unsubscribeDoc = onSnapshot(userDocRef, (doc) => {
                     if (doc.exists()) {
                        setUserData({ id: doc.id, ...doc.data() });
                    } else {
                        setUserData(null); // User exists in Auth, but not in Firestore DB
                    }
                    setLoading(false);
                });
                // Cleanup Firestore listener on user change
                return () => unsubscribeDoc();
            } else {
                setUserData(null);
                setLoading(false);
            }
        });
        // Cleanup Auth listener on component unmount
        return unsubscribe;
    }, []);

    const value = { user, userData, loading };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
