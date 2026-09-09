# n8n with Postgres

Run n8n on Lizard (lizard.build) with Managed Postgres and an authenticated JSON
webhook. The image pins n8n 2.38.5. The workflow stores a request in Postgres and
returns the stored row. Sending the same `requestId` again returns the first row
without adding a duplicate.

This is a single-instance example for JSON workflows. It does not configure
queue workers, binary file storage, backups or high availability. Keep the
n8n encryption key with the database backup. Attach Persistent Volumes when a
workflow needs local files; this example does not test their durability.

## Verified deployment

On 9 September 2026, n8n 2.38.5 with Postgres 18.6 passed seven HTTP checks
before a service restart and the same seven checks afterwards. The stored row
and its creation time stayed the same; the database still held one event.
The owner could sign in and see the imported workflow.

- [Deployment record](deployment-checks/2026-09-09.json)
- [Before restart](deployment-checks/before-restart.json) and [after restart](deployment-checks/after-restart.json)
- [Database before](deployment-checks/database-before.json) and [after](deployment-checks/database-after.json)
- [Resource snapshot](deployment-checks/resources.json), a measured rate at one point in time, not a monthly bill
- [Running editor](https://curtain-loud-vl2v.eu-west-lim-a.onlizard.com), which requires the owner login

The tested runtime code is commit `74458b0f93ee3696dc13d0941137f548e8957718`.

## Configure a service

Use the Lizard CLI with a project you own:

```bash
lizard link --project YOUR_PROJECT
lizard add postgres --name n8n-postgres --region YOUR_REGION
lizard add --repo lizard-build/n8n-postgres-example --name n8n-postgres-example --region YOUR_REGION --no-deploy
lizard domain --service n8n-postgres-example --json
```

Set these service variables through the dashboard or `lizard secrets import`.
Replace `n8n-postgres` in each reference if your database has another name.

| Variable | Value |
|---|---|
| `N8N_HOST` | The public hostname returned by `lizard domain`, without `https://` |
| `DB_TYPE` | `postgresdb` |
| `DB_POSTGRESDB_HOST` | `${{n8n-postgres.PGHOST}}` |
| `DB_POSTGRESDB_PORT` | `${{n8n-postgres.PGPORT}}` |
| `DB_POSTGRESDB_DATABASE` | `${{n8n-postgres.PGDATABASE}}` |
| `DB_POSTGRESDB_USER` | `${{n8n-postgres.PGUSER}}` |
| `DB_POSTGRESDB_PASSWORD` | `${{n8n-postgres.PGPASSWORD}}` |
| `N8N_ENCRYPTION_KEY` | A random key kept unchanged across deployments |
| `N8N_INSTANCE_OWNER_EMAIL` | Your email |
| `N8N_INSTANCE_OWNER_FIRST_NAME` | Your first name |
| `N8N_INSTANCE_OWNER_LAST_NAME` | Your last name |
| `N8N_INSTANCE_OWNER_PASSWORD_HASH` | A bcrypt hash of a strong password |
| `EXAMPLE_WEBHOOK_TOKEN` | A separate random webhook key |

Owner setup uses n8n's supported environment configuration. It prevents an
unclaimed setup page on the public URL. The owner settings apply at each start;
change their environment values when you need to change the account.

Set port 5678 and choose the repository Dockerfile explicitly:

```bash
lizard service set n8n-postgres-example --set containerPort=5678 --set dockerfilePath=Dockerfile
# Start the first deployment after configuring the service created with --no-deploy.
lizard redeploy --service n8n-postgres-example
```

The start script derives `WEBHOOK_URL` and `N8N_EDITOR_BASE_URL` from `N8N_HOST`.
It also accepts `LIZARD_PUBLIC_DOMAIN` when the runtime supplies that value. Set
`N8N_HOST` explicitly for a repeatable setup. It uses HTTPS and one trusted proxy hop. If your network adds a
proxy, check its forwarding headers and set `N8N_PROXY_HOPS` to match.

## Import the example

Once the service is ready, run these commands from the linked project directory.
They create the table and import the two credentials and the workflow. The
credential script writes a private temporary file inside the service; n8n
stores the imported credentials encrypted with `N8N_ENCRYPTION_KEY`.

```bash
lizard ssh --service n8n-postgres-example -- node /opt/lizard-example/scripts/database.js init
lizard ssh --service n8n-postgres-example -- sh -c 'n8n import:credentials --input="$(node /opt/lizard-example/scripts/prepare-credentials.js)" && n8n import:workflow --input=/opt/lizard-example/workflows/webhook-to-postgres.json && n8n publish:workflow --id=lizardPostgresExample'
lizard restart --service n8n-postgres-example
```

The CLI publication command requires a restart before the running process
registers the webhook. Sign in with the owner account to inspect the imported
workflow. Check health and readiness before sending requests.

## Check the webhook

Keep the key in an environment variable. Use the production `/webhook/` path,
not the editor's temporary `/webhook-test/` path.

```bash
curl --fail-with-body "$N8N_URL/webhook/lizard-postgres-example" \
  -H 'Content-Type: application/json' \
  -H "X-Example-Key: $EXAMPLE_WEBHOOK_TOKEN" \
  --data '{"requestId":"example-001","message":"hello"}'
```

Use unique request IDs for separate events. This example stores the first body
for each ID. A later body with the same ID does not replace it. Send only test
data to a demonstration deployment.

Run the repeatable checks from this repository with `N8N_URL` and
`EXAMPLE_WEBHOOK_TOKEN` already set in your local environment:

```bash
python3 scripts/check-webhook.py --url "$N8N_URL" --output before-restart.json
lizard restart --service n8n-postgres-example
# Wait for /healthz/readiness to return 200, then reuse the saved request ID.
REQUEST_ID=$(python3 -c 'import json; print(json.load(open("before-restart.json"))["requestId"])')
python3 scripts/check-webhook.py --url "$N8N_URL" --output after-restart.json --request-id "$REQUEST_ID"
lizard ssh --service n8n-postgres-example -- node /opt/lizard-example/scripts/database.js
```

Compare both `storedRow` values, including `created_at`, and the database row
count. The test checks valid authentication, a retry with a changed body,
missing and wrong keys, and an unknown webhook path.

## Sources

- [n8n 2.38.5 release](https://github.com/n8n-io/n8n/releases/tag/n8n%402.38.5)
- [Docker Compose installation](https://docs.n8n.io/deploy/host-n8n/install-options/install-using-docker-compose)
- [Postgres configuration](https://docs.n8n.io/deploy/host-n8n/configure-n8n/choose-n8ns-database)
- [Owner settings](https://docs.n8n.io/deploy/host-n8n/configure-n8n/manage-settings-using-environment-variables)
- [n8n CLI](https://docs.n8n.io/deploy/host-n8n/configure-n8n/use-the-command-line)
- [Lizard deployment documentation](https://lizard.build/docs/deploy/)

The files here configure n8n; they do not change its license. See
[n8n's license](https://github.com/n8n-io/n8n/blob/master/LICENSE.md).
