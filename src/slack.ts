type SlackBlock = {
    type: string;
    text: {
        type: string;
        text: string;
        emoji?: boolean;
    };
} | {
    type: 'context';
    elements: {
        type: string;
        text: string;
    }[];

}

export async function sendSlackMessage({ webhookUrl, blocks }: { webhookUrl: string, blocks: SlackBlock[] }) {
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ blocks }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Slack API error response:', errorData);
            throw new Error(`Failed to send message to Slack: ${response.statusText}. Response: ${errorData}`);
        }
    } catch (error) {
        console.error('Error sending message to Slack:', error);
        throw error;
    }
}
