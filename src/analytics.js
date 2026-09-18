const MAX_EVENTS=50;
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}})}
function cors(origin){return {'Access-Control-Allow-Origin':origin||'*','Access-Control-Allow-Headers':'Content-Type,Authorization','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin'}}
function clean(v,max=4000){return typeof v==='string'?v.slice(0,max):v}
export async function handleAnalytics(request,env){
 const headers={...cors(request.headers.get('Origin'))};
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 if(!env.DB)return json({ok:false,stored:false,error:'Analytics database is not configured yet.'},503);
 let body;try{body=await request.json()}catch{return json({error:'Invalid JSON body.'},400)};
 const event=clean(body?.event,80),anonymousId=clean(body?.anonymousId,120),payload=body?.payload&&typeof body.payload==='object'?body.payload:{};
 if(!event||!anonymousId)return json({error:'event and anonymousId are required.'},400);
 const safe={...payload};
 if(safe.question) safe.question=clean(safe.question,4000);
 if(safe.answer) safe.answer=clean(safe.answer,4000);
 if(safe.comment) safe.comment=clean(safe.comment,1500);
 try{
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS vanes_events (id INTEGER PRIMARY KEY AUTOINCREMENT, anonymous_id TEXT NOT NULL, event TEXT NOT NULL, payload TEXT, created_at TEXT NOT NULL)').run();
  await env.DB.prepare('INSERT INTO vanes_events (anonymous_id,event,payload,created_at) VALUES (?1,?2,?3,?4)').bind(anonymousId,event,JSON.stringify(safe),String(body?.at||new Date().toISOString())).run();
  return json({ok:true,stored:true},200);
 }catch(e){return json({ok:false,stored:false,error:'Analytics database write failed.'},500)}
}
export async function handleAdminAnalytics(request,env){
 const auth=request.headers.get('Authorization')||'';
 const token=auth.startsWith('Bearer ')?auth.slice(7):'';
 if(!env.ADMIN_ANALYTICS_TOKEN||token!==env.ADMIN_ANALYTICS_TOKEN)return json({error:'Unauthorized'},401);
 if(!env.DB)return json({error:'Analytics database is not configured.'},503);
 try{
  const totals=await env.DB.prepare('SELECT COUNT(*) AS events, COUNT(DISTINCT anonymous_id) AS users FROM vanes_events').first();
  const recent=await env.DB.prepare('SELECT anonymous_id,event,payload,created_at FROM vanes_events ORDER BY id DESC LIMIT 50').all();
  return json({ok:true,totals, recent:recent.results||[]});
 }catch{return json({error:'Analytics database read failed.'},500)}
}