# n8n with Postgres on Lizard

Run n8n on Lizard (lizard.build) with Managed Postgres and an authenticated JSON
webhook. The image pins n8n 2.38.5. The workflow stores a request in Postgres and
returns the stored row. Sending the same `requestId` again returns the first row
without adding a duplicate.

This is a single-instance example for JSON workflows. It does not configure
queue workers, binary file storage, backups or high availability. Keep the
n8n encryption key with the database backup. Attach Persistent Volumes when a
workflow needs local files; this example does not test their durability.

## Configure a service

Use the Lizard CLI with a project you own:

```bash
lizard link --project YOUR_PROJECT
lizard add postgres --name n8n-postgres --region YOUR_REGION
lizard add --repo lizard-build/n8n-postgres-example --name n8n-postgres-example --region YOUR_REGION --no-deploy
```

Set these service variables through the dashboard or `lizard secrets import`.
Replace `n8n-postgres` in each reference if your database has another name.

| Variable | Value |
|---|---|
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
```

The start script derives `WEBHOOK_URL` and `N8N_EDITOR_BASE_URL` from the domain
Lizard assigns. It uses HTTPS and one trusted proxy hop. If your network adds a
proxy, check its forwarding headers and set `N8N_PROXY_HOPS` to match.

## Import the example

Sign in to n8n with the owner account. Create the table from `scripts/schema.sql`
in the same Postgres database. The workflow uses bound query parameters.

Inside the service, `scripts/prepare-credentials.js` creates a private temporary
credentials file from its environment. Import that file with
`n8n import:credentials --input=PATH`, then import the workflow with
`n8n import:workflow --input=/opt/lizard-example/workflows/webhook-to-postgres.json`.
These commands store credentials encrypted with `N8N_ENCRYPTION_KEY`.

Publish workflow `lizardPostgresExample` in the n8n editor, or use:

```bash
n8n publish:workflow --id=lizardPostgresExample
```

The CLI publication command requires an n8n restart before the running process
registers the webhook. On this example service, use `lizard restart` after the
import and publication. Check health and readiness before sending requests.

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

## Sources

- [n8n 2.38.5 release](https://github.com/n8n-io/n8n/releases/tag/n8n%402.38.5)
- [Docker Compose installation](https://docs.n8n.io/deploy/host-n8n/install-options/install-using-docker-compose)
- [Postgres configuration](https://docs.n8n.io/deploy/host-n8n/configure-n8n/choose-n8ns-database)
- [Owner settings](https://docs.n8n.io/deploy/host-n8n/configure-n8n/manage-settings-using-environment-variables)
- [n8n CLI](https://docs.n8n.io/deploy/host-n8n/configure-n8n/use-the-command-line)
- [Lizard deployment documentation](https://lizard.build/docs/deploy/)

The files here configure n8n; they do not change its license. See
[n8n's license](https://github.com/n8n-io/n8n/blob/master/LICENSE.md).
