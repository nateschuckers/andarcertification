Certification Platform - Refactored
This is the refactored version of the Certification Platform application, moved from a single HTML file to a modern, multi-file React project structure.

Prerequisites
Node.js (v18 or later recommended)

npm (usually comes with Node.js)

Setup and Installation
Create Project Directory: Create a new folder for your project and navigate into it.

Save Files: Save all the files from this refactoring guide into their specified folders (e.g., src/components/Header.jsx).

Install Dependencies: Open your terminal in the project's root directory and run:

npm install

Set Up Environment Variables:

Create a new file in the root of your project named .env.

Copy the contents of the .env.example file into your new .env file.

Replace the placeholder values in .env with your actual Firebase project configuration keys.

Your .env file should look like this:

REACT_APP_FIREBASE_API_KEY="AIzaSy..."
REACT_APP_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
REACT_APP_FIREBASE_PROJECT_ID="your-project-id"
REACT_APP_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
REACT_APP_FIREBASE_MESSAGING_SENDER_ID="1234567890"
REACT_APP_FIREBASE_APP_ID="1:12345:web:abcd123"

Available Scripts
npm start
Runs the app in development mode. Open http://localhost:3000 to view it in the browser. The page will reload if you make edits.

npm build
Builds the app for production to the build folder. It correctly bundles React in production mode and optimizes the build for the best performance.

Deployment to Netlify
Push to GitHub: Make sure your refactored project is pushed to a GitHub repository.

Connect to Netlify: In your Netlify dashboard, create a new site from Git and connect it to your repository.

Build Settings: Netlify should automatically detect that it's a React app. The default settings are usually correct:

Build command: npm run build

Publish directory: build

Environment Variables:

In your Netlify site's settings, go to "Site configuration" > "Environment variables".

Add the same REACT_APP_... variables from your .env file. This is crucial for Netlify to connect to your Firebase backend securely. Do not commit your .env file to GitHub.