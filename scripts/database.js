// Run inside the official n8n image. Use only the example's dedicated database.
const { createRequire } = require('node:module');
const { readFileSync } = require('node:fs');
const n8nRequire = createRequire('/usr/local/lib/node_modules/n8n/package.json');
const { Client } = n8nRequire('pg');
const client = new Client({host:process.env.DB_POSTGRESDB_HOST,port:Number(process.env.DB_POSTGRESDB_PORT),database:process.env.DB_POSTGRESDB_DATABASE,user:process.env.DB_POSTGRESDB_USER,password:process.env.DB_POSTGRESDB_PASSWORD});
(async()=>{
  await client.connect();
  if(process.argv[2]==='init')await client.query(readFileSync(__dirname+'/schema.sql','utf8'));
  const version=(await client.query('SHOW server_version')).rows[0].server_version;
  const tables=(await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('workflow_entity','credentials_entity','execution_entity','webhook_events') ORDER BY table_name")).rows.map(r=>r.table_name);
  const events=tables.includes('webhook_events')?(await client.query('SELECT request_id, payload, created_at FROM webhook_events ORDER BY created_at')).rows:[];
  console.log(JSON.stringify({serverVersion:version,tables,events}));
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>client.end());
