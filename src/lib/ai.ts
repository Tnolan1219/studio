/**
 * Securely gets an AI response by calling our own backend API route.
 * The frontend never touches API keys.
 * @param prompt The user's question.
 * @returns The AI's response text.
 */
export async function getAIResponse(prompt: string): Promise<string> {
    const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response.');
    }

    const data = await response.json();
    return data.reply;
}
