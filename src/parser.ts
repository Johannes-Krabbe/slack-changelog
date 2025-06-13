import type { Commit } from "./github";
import type { CreateListOption } from "./slack";

const NOTICKET = "NOTICKET"
const OTHER = "OTHER"
const TICKET_CODE_REGEX = /^[A-Z]+(?:-|\s)[0-9]+/;

export function createList(
    commits: Commit[],
    opts: { linearOrg: string, serverUrl: string, repository: string }
): CreateListOption[] {
    const data: Record<string, { header: string, commits: Commit[] }> = {}

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

        list.push({ text: header, indent: 0 })

        for (const commit of commits) {
            list.push({ text: `${commit.message} (<${createCommitLink(commit, opts)}|${commit.shortSha}>)`, indent: 1 })
        }
    }

    return list
}

function createCommitLink(commit: Commit, { serverUrl, repository }: { serverUrl: string, repository: string }) {
    return `${serverUrl}/${repository}/commit/${commit.sha}`;
}
