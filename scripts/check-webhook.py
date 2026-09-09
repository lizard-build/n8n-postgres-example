#!/usr/bin/env python3
"""Check the public example. Read the key from the environment; never print it."""
import argparse,json,os,uuid,urllib.request,urllib.error,datetime
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--url',required=True);p.add_argument('--output',required=True);p.add_argument('--request-id');args=p.parse_args()
base=args.url.rstrip('/');token=os.environ['EXAMPLE_WEBHOOK_TOKEN'];rid=args.request_id or str(uuid.uuid4());results=[]
def request(label,path,body=None,key=None):
 headers={}
 if body is not None: headers['Content-Type']='application/json'
 if key is not None: headers['X-Example-Key']=key
 req=urllib.request.Request(base+path,data=json.dumps(body).encode()if body is not None else None,headers=headers)
 try:
  with urllib.request.urlopen(req,timeout=30) as r: status=r.status;data=r.read()
 except urllib.error.HTTPError as e: status=e.code;data=e.read()
 try: data=json.loads(data)
 except ValueError: data=data.decode(errors='replace')[:150]
 return status,data
for path in ['/healthz','/healthz/readiness']:
 status,_=request(path,path);results.append({'check':path,'status':status,'passed':status==200})
body={'requestId':rid,'message':"JSON survives quotes: ' ; SELECT 1;",'nested':{'count':2}}
status,first=request('authenticated','/webhook/lizard-postgres-example',body,token)
results.append({'check':'authenticated insert','status':status,'passed':status==200 and isinstance(first,dict) and first.get('request_id')==rid and first.get('payload')==body})
status,duplicate=request('duplicate','/webhook/lizard-postgres-example',dict(body,message='Changed body must not replace the first one'),token)
results.append({'check':'duplicate returns original row','status':status,'passed':status==200 and duplicate==first})
for label,key in [('missing authentication',None),('wrong authentication','invalid-test-key')]:
 status,_=request(label,'/webhook/lizard-postgres-example',{'requestId':str(uuid.uuid4())},key)
 results.append({'check':label,'status':status,'passed':status in (401,403)})
status,_=request('unknown path','/webhook/lizard-no-such-workflow',{'requestId':rid},token)
results.append({'check':'unknown webhook','status':status,'passed':status==404})
out={'checkedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':base,'requestId':rid,'checks':results,'storedRow':first,'scope':'Functional checks for a single n8n instance with Postgres; not a load, uptime or latency benchmark.'}
Path(args.output).write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({'passed':sum(x['passed']for x in results),'checks':results},indent=2));raise SystemExit(0 if all(x['passed']for x in results)else 1)
