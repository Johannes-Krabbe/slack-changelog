import * as core from '@actions/core';
import * as github from '@actions/github';
import { execSync, spawnSync } from 'child_process';
import { sendSlackMessage } from './slack';

async function run(): Promise<void> {
    try {
        // Get environment variables and context
        const beforeSha = github.context.payload.before;
        const afterSha = github.context.payload.after;
        const actor = github.context.actor;
        const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
        const repository = github.context.repo.owner + '/' + github.context.repo.repo;
        const slackWebhookUrl = core.getInput('slack-webhook-url') || process.env.SLACK_WEBHOOK_URL;

        if (!slackWebhookUrl) {
            core.setFailed('SLACK_WEBHOOK_URL is required');
            return;
        }

        core.info(`Processing commits from ${beforeSha} to ${afterSha}`);

        // Fetch all branches
        try {
            execSync('git fetch --all', { stdio: 'inherit' });
            execSync('git fetch origin +refs/heads/*:refs/remotes/origin/*', { stdio: 'inherit' });
        } catch (error) {
            core.warning(`Failed to fetch branches: ${error}`);
        }

        // Generate changelog
        const changelog = generateChangelog(beforeSha, afterSha, serverUrl, repository);


        // Send Slack notification
        try {
            await sendSlackMessage({
                webhookUrl: slackWebhookUrl, blocks: [
                    {
                        type: "header",
                        text: {
                            type: "plain_text",
                            text: "Automatic release changelog 🚀",
                            emoji: true
                        }
                    },
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: changelog
                        }
                    },
                    {
                        type: "context",
                        elements: [
                            {
                                type: "mrkdwn",
                                text: `Deployed by: ${actor} | <${serverUrl}/${repository}/tree/main|Github>`
                            }
                        ]
                    }
                ]
            });
        } catch (error) {
            core.setFailed(`Failed to send Slack notification: ${error instanceof Error ? error.message : String(error)}`);
        }

        core.info('Slack notification sent successfully');

    } catch (error) {
        core.setFailed(`Action failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

function generateChangelog(beforeSha: string, afterSha: string, serverUrl: string, repository: string): string {
    try {
        // Get commit messages for all commits in this push
        
        core.info(`TEST TEST 123`);

        const result = spawnSync('git', [
            'log',
            '--pretty=format:%H %s',
            `${beforeSha}..${afterSha}`
        ], {
            encoding: 'utf8'
        });

        if (result.error) {
            throw result.error;
        }

        const commitsOutput = result.stdout.trim();

        if (!commitsOutput) {
            return "No changes found in this deployment";
        }

        const commits = commitsOutput.split('\n').filter(line => line.trim());
        const changelogEntries: string[] = [];

        for (const line of commits) {
            const spaceIndex = line.indexOf(' ');
            if (spaceIndex === -1) continue;

            const commitHash = line.substring(0, spaceIndex);
            const commitMsg = line.substring(spaceIndex + 1);
            const shortHash = commitHash.substring(0, 7);
            const commitLink = `${serverUrl}/${repository}/commit/${commitHash}`;

            // Check if commit message starts with a Linear ticket ID
            const linearTicketRegex = /^[A-Z]+-[0-9]+/;
            const ticketMatch = commitMsg.match(linearTicketRegex);

            if (ticketMatch) {
                const ticket = ticketMatch[0];
                const ticketLink = `<https://linear.app/neotaste/issue/${ticket}|${ticket}>`;

                // Replace the ticket ID with the Slack-formatted link
                const colonIndex = commitMsg.indexOf(':');
                if (colonIndex !== -1) {
                    const restOfMsg = commitMsg.substring(colonIndex);
                    const formattedMsg = `${ticketLink}${restOfMsg}`;
                    changelogEntries.push(`- ${formattedMsg} (<${commitLink}|${shortHash}>)`);
                } else {
                    changelogEntries.push(`- ${ticketLink} (<${commitLink}|${shortHash}>)`);
                }
            } else {
                changelogEntries.push(`- ${commitMsg} (<${commitLink}|${shortHash}>)`);
            }
        }

        return changelogEntries.length > 0 ? changelogEntries.join('\n') : "No changes found in this deployment";

    } catch (error) {
        core.warning(`Failed to generate changelog: ${error}`);
        return "Failed to generate changelog";
    }
}

// Run the action
run();
