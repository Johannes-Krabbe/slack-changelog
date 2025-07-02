import type { Commit } from "./github";
import type { CreateListOption } from "./slack";

import * as core from '@actions/core';

const NOTICKET = "NOTICKET"
const OTHER = "OTHER"
const TICKET_CODE_REGEX = /^[A-Z]+(?:-|\s)[0-9]+/i;

export function createList(
    commits: Commit[],
    opts: { linearOrg: string, serverUrl: string, repository: string }
): CreateListOption[] {
    const data: Record<string, { header: string, commits: Commit[] }> = {}
    core.info(`Creating list from ${commits.length} commits`);
    core.info(JSON.stringify(commits, null, 2));

    for (const commit of commits) {
        if (commit.message.startsWith(NOTICKET)) {
            if (!data[NOTICKET]) data[NOTICKET] = { header: NOTICKET, commits: [] };
            data[NOTICKET].commits.push(commit)
            continue
        }

        const ticketMatch = commit.message.match(TICKET_CODE_REGEX);

        if (ticketMatch) {
            const ticket = ticketMatch[0].replace(/\s/, '-').toUpperCase()

            if (!data[ticket]) {
                const ticketLink = `<https://linear.app/${opts.linearOrg}/issue/${ticket}|${ticket}>`;
                data[ticket] = { header: ticketLink, commits: [] }
            };

            data[ticket].commits.push(commit)
            continue
        }

        if (!data[OTHER]) data[OTHER] = { header: OTHER, commits: [] };
        data[OTHER].commits.push(commit)
    }

    const keys = Object.keys(data).sort((a, b) => {
        if (a === OTHER) return 1;
        if (b === OTHER) return -1;
        if (a === NOTICKET) return 1;
        if (b === NOTICKET) return -1;
        return a.localeCompare(b);
    });

    const list: CreateListOption[] = [];

    for (const key of keys) {
        if (!data[key]) throw new Error(`Key ${key} not found in data (internal error)`);

        const { header, commits } = data[key];

        if (commits.length === 1) {
            const ticketMatch = commits[0]!.message.match(TICKET_CODE_REGEX);
            let messageWithoutTicket = ticketMatch
                ? commits[0]!.message.replace(ticketMatch[0], '').trim()
                : commits[0]!.message;

            if (messageWithoutTicket.startsWith(':')) messageWithoutTicket = messageWithoutTicket.replace(':', '').trim();

            list.push({ text: `${header} ${messageWithoutTicket} (<${createCommitLink(commits[0]!, opts)}|${commits[0]!.shortSha}>)`, indent: 0 });
        } else {
            list.push({ text: header, indent: 0 })

            for (const commit of commits) {
                let msg = commit.message;
                if (msg.startsWith(NOTICKET)) {
                    msg = msg.replace(NOTICKET, '').trim();
                } else if (msg.startsWith(OTHER)) {
                    msg = msg.replace(OTHER, '').trim();
                }

                msg = msg.trim();
                if (msg.startsWith(':')) msg = msg.replace(':', '').trim();


                list.push({ text: `${msg} (<${createCommitLink(commit, opts)}|${commit.shortSha}>)`, indent: 1 })
            }
        }
    }

    return list
}

function createCommitLink(commit: Commit, { serverUrl, repository }: { serverUrl: string, repository: string }) {
    return `${serverUrl}/${repository}/commit/${commit.sha}`;
}
