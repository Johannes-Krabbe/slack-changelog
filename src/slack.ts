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
} | {
    type: 'rich_text';
    elements: {
        type: 'rich_text_list';
        elements: {
            type: 'rich_text_section';
            elements: {
                type: 'text';
                text: string;
            }[];
        }[];
        style: 'bullet' | 'ordered';
        indent: number;
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

export interface CreateListOption {
    text: string;
    indent: number;
}

export async function sendChangelog({ webhookUrl, list, githubInfo }: { webhookUrl: string, list: CreateListOption[], githubInfo: { serverUrl: string, repository: string, actor: string } }) {
    await sendSlackMessage({
        webhookUrl,
        blocks: [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: "Automatic release changelog 🚀",
                    emoji: true
                }
            },
            createList(list),
            {
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: `Deployed by: ${githubInfo.actor} | <${githubInfo.serverUrl}/${githubInfo.repository}/tree/main|Github>`
                    }
                ]
            }
        ]
    });
}

function createList(opts: CreateListOption[]): SlackBlock {
    return {
        type: "rich_text",
        elements: opts.map((opt) => ({
            type: "rich_text_list",
            elements: [{
                type: "rich_text_section",
                elements: [{
                    type: "text",
                    text: opt.text
                }]
            }],
            style: "bullet",
            indent: opt.indent
        }))
    }
}
