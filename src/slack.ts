import axios from 'axios';

interface SlackBlock {
    type: string;
    text?: any;
    elements?: SlackBlock[] | any[];
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

interface SlackTextElement {
    type: "text" | "link";
    text?: string;
    url?: string;
}


function parseTextWithLinks(text: string): SlackTextElement[] {
    const elements: SlackTextElement[] = [];
    const linkRegex = /<([^|>]+)\|([^>]+)>/g;
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
        // Add text before the link
        if (match.index > lastIndex) {
            const beforeText = text.slice(lastIndex, match.index);
            if (beforeText) {
                elements.push({
                    type: "text",
                    text: beforeText
                });
            }
        }

        // Add the link
        elements.push({
            type: "link",
            url: match[1],
            text: match[2]
        });

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text after the last link
    if (lastIndex < text.length) {
        const remainingText = text.slice(lastIndex);
        if (remainingText) {
            elements.push({
                type: "text",
                text: remainingText
            });
        }
    }

    // If no links were found, return the original text
    if (elements.length === 0) {
        elements.push({
            type: "text",
            text: text
        });
    }

    return elements;
}

function createList(opts: CreateListOption[]): SlackBlock {
    return {
        type: "rich_text",
        elements: opts.map((opt) => ({
            type: "rich_text_list",
            elements: [{
                type: "rich_text_section",
                elements: parseTextWithLinks(opt.text)
            }],
            style: "bullet",
            indent: opt.indent || 0
        }))
    };
}

