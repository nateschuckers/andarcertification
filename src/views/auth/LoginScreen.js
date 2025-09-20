import React, { useState } from 'react';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    sendPasswordResetEmail 
} from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { auth, db } from '../../firebase/config';

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRegister, setIsRegister] = useState(false);
    const [name, setName] = useState(''); // For registration
    const [message, setMessage] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            // Create user profile in Firestore
            await setDoc(doc(db, "users", user.uid), {
                name: name,
                email: user.email,
                isAdmin: false, // Default to not admin
                trackIds: []
            });
             await setDoc(doc(db, "activityLogs", user.uid), {
                logins: 1,
                lastLogin: new Date().toISOString(),
                totalTrainingTime: 0,
                attempts: 0, passes: 0, fails: 0, passRate: 0
            });
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    };
    
    const handlePasswordReset = async () => {
        if (!email) {
            setError("Please enter your email to reset password.");
            return;
        }
        setLoading(true);
        setError('');
        setMessage('');
        try {
            await sendPasswordResetEmail(auth, email);
            setMessage("Password reset email sent! Check your inbox.");
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    }

    const inputClasses = "w-full mt-1 bg-neutral-100 dark:bg-neutral-700 p-2 rounded border border-neutral-300 dark:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-neutral-100";

    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-900">
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md dark:shadow-neutral-900 p-8 w-full max-w-sm">
                <div className="flex justify-center mb-6">
                     <img src="assets/logo-light.png" alt="Company Logo" className="h-10 dark:hidden" />
                     <img src="assets/logo-dark.png" alt="Company Logo Dark" className="h-10 hidden dark:block" />
                </div>
                <h2 className="text-2xl font-bold text-center mb-6 text-neutral-900 dark:text-white">Certification Platform</h2>
                <form onSubmit={isRegister ? handleRegister : handleLogin}>
                    <div className="space-y-4">
                        {isRegister && (
                             <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Full Name</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} required className={inputClasses} />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Email Address</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputClasses} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Password</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className={inputClasses} />
                        </div>
                        <button type="submit" disabled={loading} className="w-full btn-primary text-white font-bold py-2 px-4 rounded disabled:bg-neutral-400">
                            {loading ? 'Loading...' : (isRegister ? 'Register' : 'Login')}
                        </button>
                    </div>
                </form>
                {error && <p className="mt-4 text-center text-red-500 text-sm">{error}</p>}
                {message && <p className="mt-4 text-center text-green-500 text-sm">{message}</p>}
                <div className="mt-4 text-center text-sm">
                    <button onClick={() => setIsRegister(!isRegister)} className="text-blue-600 hover:underline">
                        {isRegister ? 'Already have an account? Login' : 'Need an account? Register'}
                    </button>
                </div>
                 <div className="mt-2 text-center text-sm">
                    <button onClick={handlePasswordReset} className="text-neutral-500 hover:underline">
                        Forgot Password?
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;

