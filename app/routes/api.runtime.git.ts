/**
 * @route /api/runtime/git
 * Server-side API route for git operations on project directories.
 *
 * POST operations:
 *   - commit: Stage all changes and create a commit
 *   - log: Get commit history
 *   - checkout: Checkout a specific commit
 *   - checkout-main: Return to main branch
 *   - diff: Get diff stat for a commit
 *   - commit-files: Get files changed in a commit
 */

import type { ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { RuntimeManager } from '~/lib/runtime/local-runtime';
import { isValidProjectId } from '~/lib/runtime/runtime-provider';
import {
  autoCommit,
  getGitLog,
  getDiff,
  checkoutCommit,
  checkoutMain,
  getCommitFiles,
  getCommitFilesWithStatus,
  getFileDiff,
  getCommitDiff,
  archiveCommit,
  archiveChangedFiles,
} from '~/lib/runtime/git-manager';
import { withSecurity } from '~/lib/security';

async function gitAction({ request }: ActionFunctionArgs) {
  let body: any;

  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const { op, projectId } = body;

  if (!projectId || !isValidProjectId(projectId)) {
    return json({ error: 'Invalid or missing projectId' }, { status: 400 });
  }

  const manager = RuntimeManager.getInstance();

  let runtime;

  try {
    runtime = await manager.getRuntime(projectId);
  } catch {
    return json({ error: 'Runtime not found for project' }, { status: 404 });
  }

  const workdir = runtime.workdir;

  switch (op) {
    case 'commit': {
      const { message } = body;

      if (!message || typeof message !== 'string') {
        return json({ error: 'Missing commit message' }, { status: 400 });
      }

      const sha = autoCommit(workdir, message);

      return json({ sha, committed: !!sha });
    }

    case 'log': {
      const maxCount = body.maxCount ?? 50;
      const commits = getGitLog(workdir, maxCount);

      return json({ commits });
    }

    case 'checkout': {
      const { sha } = body;

      if (!sha || typeof sha !== 'string') {
        return json({ error: 'Missing commit SHA' }, { status: 400 });
      }

      const success = checkoutCommit(workdir, sha);

      return json({ success });
    }

    case 'checkout-main': {
      const success = checkoutMain(workdir);
      return json({ success });
    }

    case 'diff': {
      const { sha } = body;

      if (!sha || typeof sha !== 'string') {
        return json({ error: 'Missing commit SHA' }, { status: 400 });
      }

      const diff = getDiff(workdir, sha);

      return json({ diff });
    }

    case 'commit-files': {
      const { sha } = body;

      if (!sha || typeof sha !== 'string') {
        return json({ error: 'Missing commit SHA' }, { status: 400 });
      }

      const files = getCommitFiles(workdir, sha);

      return json({ files });
    }

    case 'commit-files-status': {
      const { sha } = body;

      if (!sha || typeof sha !== 'string') {
        return json({ error: 'Missing commit SHA' }, { status: 400 });
      }

      const files = getCommitFilesWithStatus(workdir, sha);

      return json({ files });
    }

    case 'file-diff': {
      const { sha, file } = body;

      if (!sha || typeof sha !== 'string') {
        return json({ error: 'Missing commit SHA' }, { status: 400 });
      }

      if (!file || typeof file !== 'string') {
        return json({ error: 'Missing file path' }, { status: 400 });
      }

      const diff = getFileDiff(workdir, sha, file);

      return json({ diff });
    }

    case 'commit-diff': {
      const { sha } = body;

      if (!sha || typeof sha !== 'string') {
        return json({ error: 'Missing commit SHA' }, { status: 400 });
      }

      const diff = getCommitDiff(workdir, sha);

      return json({ diff });
    }

    case 'archive': {
      const { sha, type: archiveType } = body;

      if (!sha || typeof sha !== 'string') {
        return json({ error: 'Missing commit SHA' }, { status: 400 });
      }

      try {
        const zipBuffer = archiveType === 'changed' ? archiveChangedFiles(workdir, sha) : archiveCommit(workdir, sha);

        return new Response(new Uint8Array(zipBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="project-${sha.substring(0, 7)}.zip"`,
            'Content-Length': String(zipBuffer.length),
          },
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Archive failed';
        return json({ error: msg }, { status: 500 });
      }
    }

    default: {
      return json({ error: `Unknown git operation: ${op}` }, { status: 400 });
    }
  }
}

export const action = withSecurity(gitAction, { rateLimit: false });
