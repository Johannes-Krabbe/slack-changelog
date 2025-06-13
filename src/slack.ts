import axios from 'axios';

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
        await axios.post(webhookUrl, JSON.stringify({ blocks }))
    } catch (error) {
        if (error instanceof Error) {
            console.error('Error sending message to Slack:', error.message);
        }
        throw error;
    }
}
