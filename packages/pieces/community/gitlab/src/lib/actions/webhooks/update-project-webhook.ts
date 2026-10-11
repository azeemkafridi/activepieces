import { createAction, Property } from '@activepieces/pieces-framework';
import { gitlabAuth } from '../../auth';
import { adminProps } from '../../common/admin';
import { gitlabRequest, projectPath } from '../../common/client';
import { gitlabProps, optionalText, requirePositiveInt } from '../../common/props';
import { hookOutputSchema } from '../../output-schemas-admin';
import { hookBody, hookCommonProps, hookEventProps, requireHookUrl, withoutToken } from './create-project-webhook';

export const updateProjectWebhookAction = createAction({
  auth: gitlabAuth,
  name: 'update_project_webhook',
  displayName: 'Update Project Webhook',
  description: 'Changes the URL, events or secret token of a project webhook. Fields left empty are not changed.',
  audience: 'ai',
  classification: 'WRITE',
  aiMetadata: {
    description: 'Changes a GitLab project webhook: URL, name, description, secret token, branch filter, SSL verification and which events fire it. Only the fields you set are sent; when URL is empty the current URL is kept. Changing a webhook created by an Activepieces trigger can stop that trigger. Requires Maintainer role.',
    idempotent: true,
  },
  props: {
    projectId: gitlabProps.projectId(),
    hookId: adminProps.hookId(),
    url: Property.ShortText({ displayName: 'URL', description: 'Leave empty to keep the current URL.', required: false }),
    ...hookCommonProps(),
    ...hookEventProps('Leave empty to keep the current value.'),
  },
  outputSchema: hookOutputSchema,
  async run({ auth, propsValue }) {
    const hookId = requirePositiveInt({ value: propsValue.hookId, label: 'Webhook ID' });
    const path = `${projectPath(propsValue.projectId)}/hooks/${hookId}`;
    const changes = hookBody(propsValue);
    const newUrl = optionalText(propsValue.url);
    if (newUrl === undefined && Object.keys(changes).length === 0) {
      throw new Error('Set at least one field to update.');
    }
    let url: string;
    if (newUrl !== undefined) {
      url = requireHookUrl(newUrl);
    } else {
      const current = await gitlabRequest<{ url: string }>({ auth,  method: 'GET', path });
      url = current.url;
    }
    return withoutToken(await gitlabRequest({ auth,  method: 'PUT', path, body: { url, ...changes } }));
  },
});
