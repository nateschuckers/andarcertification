const functions = require("firebase-functions");
const { GoogleAuth } = require("google-auth-library");
const { HttpsError } = require("firebase-functions/v2/https");

// This function is the secure backend that will call the Google AI API.
exports.generateQuestions = functions.runWith({ timeoutSeconds: 300 }).https.onCall(async (data, context) => {
    // 1. Log entry and authentication
    functions.logger.info("Function triggered.", { uid: context.auth ? context.auth.uid : "unauthenticated" });

    if (!context.auth) {
        functions.logger.warn("Function executed by unauthenticated user.");
        throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }

    const { text, difficulty, numQuestions } = data;
    if (!text || !difficulty || !numQuestions) {
        functions.logger.error("Invalid arguments received.", data);
        throw new HttpsError("invalid-argument", "Missing required arguments: text, difficulty, numQuestions.");
    }

    // 2. Log the parameters
    functions.logger.info("Parameters received:", { difficulty, numQuestions, textLength: text.length });

    let difficultyInstruction = '';
    if (difficulty <= 3) {
        difficultyInstruction = "The questions should be straightforward, with answers directly stated in the text.";
    } else if (difficulty <= 7) {
        difficultyInstruction = "The questions should require some comprehension of the text. Incorrect answers might be plausible but are factually wrong.";
    } else {
        difficultyInstruction = "The questions should require application or synthesis of concepts from the text. Incorrect answers should be very similar to the correct answer.";
    }

    const prompt = `Based *only* on the following text, generate exactly ${numQuestions} multiple-choice quiz questions with a difficulty of ${difficulty} out of 10. ${difficultyInstruction} For each question, provide 4 options and the correct answer. The answer options must be concise and fit neatly on a button. Format the output as a valid JSON array of objects, where each object has "text" (the question), "options" (an array of 4 strings), and "correctAnswer" (the zero-based index of the correct option). Your response must contain ONLY the JSON array and nothing else.\n\nText:\n${text}`;

    try {
        const auth = new GoogleAuth({
            scopes: "https://www.googleapis.com/auth/cloud-platform",
        });

        const client = await auth.getClient();
        const projectId = await auth.getProjectId();
        
        // 3. Log the authentication details to confirm the correct project is being used
        functions.logger.info("Authenticating with project:", { projectId });

        const location = "us-central1";
        const model = "gemini-1.5-flash-preview-0514";
        const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

        functions.logger.info("Making request to Vertex AI:", { url });

        const response = await client.request({
            url,
            method: "POST",
            data: {
                contents: [{ parts: [{ text: prompt }] }],
            },
        });
        
        functions.logger.info("Successfully received response from Vertex AI.");

        const responseData = response.data;
        if (!responseData.candidates || !responseData.candidates[0].content || !responseData.candidates[0].content.parts[0] || !responseData.candidates[0].content.parts[0].text) {
             functions.logger.error("Invalid response structure from AI API:", responseData);
             throw new Error("Invalid response structure from AI API.");
        }
        
        const rawText = responseData.candidates[0].content.parts[0].text;
        const jsonString = rawText.replace(/```json|```/g, "").trim();
        const questions = JSON.parse(jsonString);

        functions.logger.info(`Successfully parsed ${questions.length} questions.`);
        return { questions };

    } catch (error) {
        // 6. Log the FULL error object for detailed debugging
        functions.logger.error("Caught an error during AI API call.", {
            errorMessage: error.message,
            errorStack: error.stack,
            apiResponse: error.response ? error.response.data : "No response data",
        });
        throw new HttpsError("internal", "Failed to generate questions from the AI model.", { details: error.message });
    }
});
```

### Next Steps: The Final Debugging Push

1.  **Redeploy the Function:** After updating the file, go to your terminal, navigate to the **root directory** of your project, and run the deploy command:
    ```bash
    firebase deploy --only functions
    

