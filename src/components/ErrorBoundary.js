import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="p-8 text-center bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-200 rounded-lg m-4">
                    <h2 className="text-2xl font-bold mb-2">Something went wrong.</h2>
                    <p>Please try refreshing the page. If the problem persists, contact support.</p>
                    <pre className="mt-4 text-left text-xs bg-red-200 dark:bg-red-800/50 p-2 rounded overflow-auto">
                        {this.state.error && this.state.error.toString()}
                    </pre>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
