const functions = require("firebase-functions");
const { GoogleAuth } = require("google-auth-library");
const { HttpsError } = require("firebase-functions/v2/https");

// This function is the secure backend that will call the Google AI API.
exports.generateQuestions = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }

    const { text, difficulty, numQuestions } = data;
    if (!text || !difficulty || !numQuestions) {
        throw new HttpsError("invalid-argument", "Missing required arguments: text, difficulty, numQuestions.");
    }

    let difficultyInstruction = '';
    if (difficulty <= 3) {
        difficultyInstruction = "The questions should be straightforward, with answers directly stated in the text.";
    } else if (difficulty <= 7) {
        difficultyInstruction = "The questions should require some comprehension of the text. Incorrect answers might be plausible but are factually wrong.";
    } else {
        difficultyInstruction = "The questions should require application or synthesis of concepts from the text. Incorrect answers should be very similar to the correct answer.";
    }

    const prompt = `Based *only* on the following text, generate exactly ${numQuestions} multiple-choice quiz questions with a difficulty of ${difficulty} out of 10. ${difficultyInstruction} For each question, provide 4 options and the correct answer. The answer options must be concise and fit neatly on a button. Format the output as a valid JSON array of objects, where each object has "text" (the question), "options" (an array of 4 strings), and "correctAnswer" (the zero-based index of the correct option). Your response must contain ONLY the JSON array and nothing else.

    Text:
    ${text}`;

    try {
        const auth = new GoogleAuth({
            scopes: "https://www.googleapis.com/auth/cloud-platform",
        });
        const client = await auth.getClient();
        const projectId = await auth.getProjectId();
        const location = "us-central1"; // Or your preferred location
        const model = "gemini-1.5-flash-preview-0514";

        const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;
        
        const response = await client.request({
            url,
            method: "POST",
            data: {
                contents: [{ parts: [{ text: prompt }] }],
            },
        });
        
        const responseData = response.data;
        if (!responseData.candidates || !responseData.candidates[0].content || !responseData.candidates[0].content.parts[0] || !responseData.candidates[0].content.parts[0].text) {
             console.error("Invalid response structure from AI API:", JSON.stringify(responseData, null, 2));
             throw new Error("Invalid response structure from AI API.");
        }
        
        const rawText = responseData.candidates[0].content.parts[0].text;
        const jsonString = rawText.replace(/```json|```/g, "").trim();
        const questions = JSON.parse(jsonString);

        return { questions };

    } catch (error) {
        console.error("AI API Error:", error.response ? error.response.data.error : error.message);
        throw new HttpsError("internal", "Failed to generate questions from the AI model.", { details: error.message });
    }
});
```

### Next Steps: The Final Configuration

After updating the file, you need to perform the one-time permission update as requested by the error log.

1.  **Go to the Google Cloud API Library:** Click this specific link to go directly to the Vertex AI API page for your project: [https://console.cloud.google.com/apis/library/aiplatform.googleapis.com?project=certification2-2bacd](https://console.cloud.google.com/apis/library/aiplatform.googleapis.com?project=certification2-2bacd)
2.  **Enable the API:** On that page, click the blue **"Enable"** button. It may take a minute or two to complete.
    3.  **Redeploy Your Function:** Finally, go to your terminal, navigate to the **root directory** of your project, and run the deploy command one last time:
    ```bash
    firebase deploy --only functions
    

