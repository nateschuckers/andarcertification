const functions = require("firebase-functions");
const { GoogleAuth } = require("google-auth-library");
const { HttpsError } = require("firebase-functions/v2/https");

// This function is the secure backend that will call the Google AI API.
// It uses the function's own identity to authenticate, which is the most secure method.
exports.generateQuestions = functions.https.onCall(async (data, context) => {
    // Ensure the user is an authenticated admin to prevent abuse.
    if (!context.auth) {
        throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    // You could add a check here to ensure the user is an admin if needed:
    // const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    // if (!userDoc.data()?.isAdmin) {
    //     throw new functions.https.HttpsError('permission-denied', 'User must be an admin.');
    // }

    const { text, difficulty, numQuestions } = data;

    if (!text || !difficulty || !numQuestions) {
        throw new HttpsError("invalid-argument", "The function must be called with 'text', 'difficulty', and 'numQuestions' arguments.");
    }

    let difficultyInstruction = '';
    if (difficulty <= 3) {
        difficultyInstruction = "The questions should be straightforward, with answers directly stated in the text. The incorrect options should be clearly different from the correct answer.";
    } else if (difficulty <= 7) {
        difficultyInstruction = "The questions should require some comprehension of the text. Incorrect answers might be plausible but are factually wrong based on the document.";
    } else {
        difficultyInstruction = "The questions should require application or synthesis of concepts from the text. Incorrect answers should be very similar in wording or context to the correct answer, designed to test close reading and nuanced understanding.";
    }

    const prompt = `Based on the following text, generate ${numQuestions} multiple-choice quiz questions with a difficulty of ${difficulty} out of 10. ${difficultyInstruction} For each question, provide 4 options and the correct answer. The answer options should be concise and fit neatly on a button. Format the output as a valid JSON array of objects, where each object has "text" (the question), "options" (an array of 4 strings), and "correctAnswer" (the zero-based index of the correct option). Do not include any text or markdown formatting before or after the JSON array.\n\nText:\n${text}`;

    const auth = new GoogleAuth({
        scopes: "https://www.googleapis.com/auth/cloud-platform",
    });
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();
    const location = "us-central1";
    const model = "gemini-1.0-pro";

    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:streamGenerateContent`;
    const body = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
    };

    try {
        const response = await client.request({
            url,
            method: "POST",
            data: body,
        });

        // The response for a streaming model is an array of chunks. We need to combine them.
        let combinedText = "";
        if (response.data && Array.isArray(response.data)) {
            response.data.forEach(chunk => {
                if (chunk.candidates && chunk.candidates[0].content && chunk.candidates[0].content.parts[0]) {
                    combinedText += chunk.candidates[0].content.parts[0].text;
                }
            });
        } else {
            throw new Error("Unexpected response format from AI API.");
        }
        
        const jsonString = combinedText.replace(/```json|```/g, "").trim();
        const questions = JSON.parse(jsonString);

        return { questions };

    } catch (error) {
        console.error("AI API Error:", error.response ? error.response.data : error.message);
        throw new HttpsError("internal", "Failed to generate questions from AI model.", error.message);
    }
});
