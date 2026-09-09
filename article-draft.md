---
slug: n8n-webhook-postgres-example
title: "n8n webhook to Postgres: a deployment example on Lizard"
metaTitle: "n8n Webhook to Postgres: Tested Deployment Example"
metaDescription: "Run an authenticated n8n webhook with Postgres on Lizard. Follow the pinned example, prevent duplicate rows and check data after a service restart."
excerpt: "A reproducible n8n example: receive JSON, store it in Postgres and return the saved row. Includes authentication and checks after a service restart."
authorIds: ["yura-oak"]
tags: ["Engineering"]
---
**An n8n webhook can write JSON to Postgres and return the saved row in one workflow.** This example runs n8n on Lizard, protects the webhook with a header credential, and uses a request ID to avoid duplicate rows when a sender retries.

The [public repository](https://github.com/lizard-build/n8n-postgres-example) includes the pinned image, workflow, table definition and check script. This article covers a single n8n instance and JSON requests. For the broader hosting setup, start with [n8n hosting on Lizard](/deploy/n8n--n8n).

## What the example runs

The n8n service and its dedicated Managed Postgres run in the same region. Postgres holds both n8n's own workflow and credential records and the example's `webhook_events` table. The application uses one instance; there is no Redis queue or separate worker in this example.

The repository pins n8n 2.38.5 and the official image's digest. A fixed digest makes the image choice reproducible. Review later n8n releases and test upgrades before changing the pin.

The workflow has three nodes:

1. **Webhook** accepts a production POST request with an `X-Example-Key` header.
2. **Store event** executes a parameterised Postgres query.
3. **Respond** returns the stored request ID, JSON body and creation time.

## Configure the database, owner and public URL

Create a service from the repository and a separate Managed Postgres in the same Lizard project. The [repository instructions](https://github.com/lizard-build/n8n-postgres-example#configure-a-service) list the commands and environment variables.

Set `DB_TYPE=postgresdb` and bind the database host, port, name, user and password to the addon's variables. A database running beside n8n is not enough: n8n must receive those values and connect successfully. See [n8n's Postgres configuration](https://docs.n8n.io/deploy/host-n8n/configure-n8n/choose-n8ns-database).

Generate and retain a separate `N8N_ENCRYPTION_KEY` before the first start. n8n uses it to protect credentials stored in its database. A new random key on each deployment would prevent n8n from reading the old credentials. Keep the key with your recovery records, outside the repository.

The example also configures the owner before n8n becomes reachable. It uses `N8N_INSTANCE_OWNER_MANAGED_BY_ENV` and a bcrypt password hash, following [n8n's owner configuration](https://docs.n8n.io/deploy/host-n8n/configure-n8n/manage-settings-using-environment-variables). The login password and the webhook key are separate secrets.

Set `N8N_HOST` to the service's public hostname, without a scheme or path. The start script builds the HTTPS `WEBHOOK_URL` and editor URL from that hostname. Use port 5678. Check the proxy-hop setting if you add another proxy in front of Lizard.

## Import and publish the workflow

Create `webhook_events` with the SQL file in the repository. Import the Postgres and header credentials into n8n, then import the workflow. The credential preparation script reads secret values from the service environment and writes a private temporary import file; the public workflow contains only credential IDs and names.

Use the n8n editor to publish the workflow, or use `n8n publish:workflow --id=lizardPostgresExample`. CLI publication changes the database; the running n8n process needs a restart to register that change. This behaviour is documented in the [n8n CLI guide](https://docs.n8n.io/deploy/host-n8n/configure-n8n/use-the-command-line).

Check `/healthz/readiness` before sending requests. The production URL uses `/webhook/lizard-postgres-example`. The `/webhook-test/` URL belongs to an editor test session and is not a substitute for a published workflow.

## Send a request and test a retry

With the public URL and webhook key in environment variables:

```bash
curl --fail-with-body "$N8N_URL/webhook/lizard-postgres-example" \
  -H 'Content-Type: application/json' \
  -H "X-Example-Key: $EXAMPLE_WEBHOOK_TOKEN" \
  --data '{"requestId":"example-001","message":"hello"}'
```

The SQL query binds the request ID and JSON body as values. It does not build SQL by joining user input into the query text. Quotes and nested JSON remain data.

The table's primary key is `request_id`. On a conflict, the query returns the first saved row. Sending the same ID with a different message does not change the original payload. That is this example's retry policy; choose a different policy if your application needs updates or conflict errors.

Use a new request ID for each distinct event. Do not reuse a test ID to represent a new event and expect a second row.

## Deployment checks

On 9 September 2026, we ran n8n 2.38.5 with Postgres 18.6 in `eu-west-lim-a`. The same seven checks passed before and after restarting the n8n service.

| Check | Before restart | After restart |
|---|---|---|
| Health endpoint | 200 | 200 |
| Database readiness | 200 | 200 |
| Request with the correct key | 200; stored body returned | 200; stored body returned |
| Same request ID with a changed body | Original row returned | Original row returned |
| Missing key | 403 | 403 |
| Wrong key | 403 | 403 |
| Unknown webhook path | 404 | 404 |

The database held one event after both runs. The JSON body and creation time matched across the restart. The test body included quotes and nested JSON. The owner also signed in and found the imported workflow in the editor.

Read the [deployment record and raw results](https://github.com/lizard-build/n8n-postgres-example/tree/main/deployment-checks). The record names the tested code commit. Run the repository's check script against your own deployment before using it for your workflows.

## What these checks do not cover

The example does not test load, uptime, cold-start latency or a full monthly bill. It does not set up queue mode, database backups, file uploads or recovery from database loss.

A service restart check establishes that this deployment can read its saved workflows and credentials after restarting. It does not establish disaster recovery. For that, take a database backup, retain the encryption key, restore into a separate environment and run the workflow again.

This JSON workflow does not require a persistent local filesystem. Workflows that read or write local files need suitable storage and their own persistence tests. Review Persistent Volumes and n8n's storage requirements before adding that workload.

## FAQ

**Does n8n need Postgres?** No. Self-hosted n8n can use SQLite. This example uses Postgres to keep workflow, credential and execution records outside the application container and to demonstrate a database-writing workflow.

**Why does a webhook work in the editor but return 404 elsewhere?** Check that the workflow is published and that the sender uses the production `/webhook/` path. A CLI publication also requires the running n8n process to restart.

**What must stay the same after a redeploy?** The database connection must point to the intended database, and the encryption key must still decrypt its credentials. Keep the public webhook URL and authentication contract stable for callers.

**Is this a complete production n8n setup?** It is a checked single-instance example. Add backups, monitoring, storage and a capacity plan for your workload before depending on it for production automation.
