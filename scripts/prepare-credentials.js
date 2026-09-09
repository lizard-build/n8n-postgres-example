// Run inside the n8n service. No credential values are printed.
const fs = require('node:fs');
const path = require('node:path');
const dir = fs.mkdtempSync('/tmp/lizard-n8n-');
fs.chmodSync(dir, 0o700);
for (const key of ['DB_POSTGRESDB_HOST','DB_POSTGRESDB_PORT','DB_POSTGRESDB_DATABASE','DB_POSTGRESDB_USER','DB_POSTGRESDB_PASSWORD','EXAMPLE_WEBHOOK_TOKEN']) {
  if (!process.env[key]) throw new Error(`Missing ${key}`);
}
const credentials = [
  {id:'lizardExamplePostgres',name:'Example Postgres',type:'postgres',data:{host:process.env.DB_POSTGRESDB_HOST,port:Number(process.env.DB_POSTGRESDB_PORT),database:process.env.DB_POSTGRESDB_DATABASE,user:process.env.DB_POSTGRESDB_USER,password:process.env.DB_POSTGRESDB_PASSWORD,ssl:'disable',allowUnauthorizedCerts:false}},
  {id:'lizardExampleWebhook',name:'Example webhook header',type:'httpHeaderAuth',data:{name:'X-Example-Key',value:process.env.EXAMPLE_WEBHOOK_TOKEN}}
];
const file=path.join(dir,'credentials.json');fs.writeFileSync(file,JSON.stringify(credentials),{mode:0o600});
console.log(file);
