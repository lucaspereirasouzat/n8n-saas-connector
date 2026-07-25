import crypto from 'node:crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import Stripe from 'stripe';

const app = express();
const PORT = Number(process.env.PORT || 3001);
const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const production = process.env.NODE_ENV === 'production';
if (production && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) throw new Error('SESSION_SECRET segura é obrigatória em produção');

type User = { id:string; name:string; email:string; password:string; photo:string; theme:'light'|'dark'|'system'; stripeCustomerId?:string; plan:'free'|'starter'|'pro'; trialUsed:boolean };
type Integration = { id:string; provider:string; name:string; active:boolean; workflowId?:string; createdAt:string };
const users = new Map<string, User>();
const sessions = new Map<string, { userId:string; expires:number }>();
const integrations = new Map<string, Integration[]>();
const resetTokens = new Map<string, { userId:string; expires:number }>();
const hashPassword = (password:string, salt=crypto.randomBytes(16).toString('hex')) => `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
const validPassword = (password:string, stored:string) => { const [salt,key]=stored.split(':'); return crypto.timingSafeEqual(Buffer.from(key,'hex'), crypto.scryptSync(password,salt,64)); };
const demo:User={id:'demo-user',name:'Marina Costa',email:'marina@empresa.com',password:hashPassword('Demo123!'),photo:'',theme:'system',plan:'free',trialUsed:false};
users.set(demo.id,demo); integrations.set(demo.id,[{id:'wa-1',provider:'whatsapp',name:'Atendimento WhatsApp',active:true,workflowId:'demo-1',createdAt:new Date().toISOString()},{id:'gm-1',provider:'gmail',name:'Triagem de e-mails',active:true,workflowId:'demo-2',createdAt:new Date().toISOString()}]);

app.disable('x-powered-by'); app.use(helmet({contentSecurityPolicy:false}));
app.post('/api/stripe/webhook', express.raw({type:'application/json'}), (req,res)=>{
  if(!process.env.STRIPE_SECRET_KEY||!process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).json({error:'Stripe não configurada'});
  try { const stripe=new Stripe(process.env.STRIPE_SECRET_KEY); const event=stripe.webhooks.constructEvent(req.body,req.header('stripe-signature')||'',process.env.STRIPE_WEBHOOK_SECRET); if(event.type==='checkout.session.completed'){const session=event.data.object;const user=users.get(session.metadata?.userId||'');const plan=session.metadata?.plan;if(user&&(plan==='starter'||plan==='pro')){user.plan=plan;user.trialUsed=true;}} if(event.type==='customer.subscription.deleted'){ const sub=event.data.object; for(const u of users.values()) if(u.stripeCustomerId===sub.customer) u.plan='free'; } return res.json({received:true}); } catch { return res.status(400).json({error:'Assinatura inválida'}); }
});
app.use(express.json({limit:'100kb'})); app.use(cookieParser());
app.use('/api',(req,res,next)=>{ if(['POST','PUT','PATCH','DELETE'].includes(req.method)){ const origin=req.header('origin'); if(origin && origin!==APP_URL) return res.status(403).json({error:'Origem não permitida'}); } res.setHeader('Cache-Control','no-store'); next(); });
const currentUser=(req:express.Request)=>{ const id=req.cookies.flowly_session; const session=sessions.get(id); if(!session||session.expires<Date.now()){ if(id)sessions.delete(id); return undefined; } return users.get(session.userId); };
const auth:express.RequestHandler=(req,res,next)=>{ const user=currentUser(req); if(!user)return res.status(401).json({error:'Não autenticado'}); res.locals.user=user; next(); };
const publicUser=(u:User)=>({id:u.id,name:u.name,email:u.email,photo:u.photo,theme:u.theme,plan:u.plan});
const setSession=(res:express.Response,userId:string)=>{const token=crypto.randomBytes(32).toString('base64url');sessions.set(token,{userId,expires:Date.now()+7*864e5});res.cookie('flowly_session',token,{httpOnly:true,secure:production,sameSite:'lax',maxAge:7*864e5,path:'/'});};

app.post('/api/auth/register',(req,res)=>{const name=String(req.body.name||'').trim(),email=String(req.body.email||'').trim().toLowerCase(),password=String(req.body.password||'');if(name.length<2||!/^\S+@\S+\.\S+$/.test(email)||password.length<8)return res.status(400).json({error:'Confira nome, e-mail e senha (mínimo 8 caracteres).'});if([...users.values()].some(u=>u.email===email))return res.status(409).json({error:'E-mail já cadastrado.'});const user:User={id:crypto.randomUUID(),name,email,password:hashPassword(password),photo:'',theme:'system',plan:'free',trialUsed:false};users.set(user.id,user);integrations.set(user.id,[]);setSession(res,user.id);return res.status(201).json({user:publicUser(user)});});
app.post('/api/auth/login',(req,res)=>{const email=String(req.body.email||'').toLowerCase(),password=String(req.body.password||'');const user=[...users.values()].find(u=>u.email===email);if(!user||!validPassword(password,user.password))return res.status(401).json({error:'E-mail ou senha incorretos.'});setSession(res,user.id);return res.json({user:publicUser(user)});});
app.post('/api/auth/logout',auth,(req,res)=>{sessions.delete(req.cookies.flowly_session);res.clearCookie('flowly_session',{path:'/'});res.status(204).end();});
app.get('/api/auth/me',auth,(_req,res)=>res.json({user:publicUser(res.locals.user)}));
app.post('/api/auth/forgot',(req,res)=>{const user=[...users.values()].find(u=>u.email===String(req.body.email||'').toLowerCase());if(user){const token=crypto.randomBytes(32).toString('hex');resetTokens.set(token,{userId:user.id,expires:Date.now()+36e5});if(!production)console.info(`[dev] reset: ${APP_URL}/redefinir-senha?token=${token}`);}res.json({message:'Se o e-mail estiver cadastrado, enviaremos as instruções.'});});

app.get('/api/dashboard',auth,(_req,res)=>{const list=integrations.get(res.locals.user.id)||[];res.json({user:publicUser(res.locals.user),integrations:list,stats:{active:list.filter(i=>i.active).length,runs:133,savedHours:12.5}});});
const n8nRequest=async(path:string,init?:RequestInit)=>{if(!process.env.N8N_BASE_URL||!process.env.N8N_API_KEY)return null;const response=await fetch(`${process.env.N8N_BASE_URL.replace(/\/$/,'')}/api/v1${path}`,{...init,headers:{'Content-Type':'application/json','X-N8N-API-KEY':process.env.N8N_API_KEY,...init?.headers}});if(!response.ok)throw new Error('Falha ao comunicar com n8n');return response.json();};
app.post('/api/integrations',auth,(req,res)=>{const provider=String(req.body.provider||''),name=String(req.body.name||'').trim();if(!['whatsapp','gmail','sheets','slack'].includes(provider)||name.length<2)return res.status(400).json({error:'Dados inválidos'});const item:Integration={id:crypto.randomUUID(),provider,name,active:false,createdAt:new Date().toISOString()};integrations.get(res.locals.user.id)!.push(item);res.status(201).json(item);});
app.patch('/api/integrations/:id',auth,async(req,res)=>{const item=(integrations.get(res.locals.user.id)||[]).find(i=>i.id===req.params.id);if(!item)return res.status(404).json({error:'Integração não encontrada'});const active=req.body.active===true;try{if(item.workflowId)await n8nRequest(`/workflows/${encodeURIComponent(item.workflowId)}/${active?'activate':'deactivate'}`,{method:'POST'});item.active=active;res.json(item);}catch{return res.status(502).json({error:'Não foi possível atualizar o workflow'});}});
app.patch('/api/profile',auth,(req,res)=>{const user:User=res.locals.user;const name=String(req.body.name||'').trim(),photo=String(req.body.photo||''),theme=String(req.body.theme||'');if(name.length<2||photo.length>500_000||(photo!==''&&!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(photo))||!['light','dark','system'].includes(theme))return res.status(400).json({error:'Perfil inválido'});user.name=name;user.photo=photo;user.theme=theme as User['theme'];res.json({user:publicUser(user)});});
const PRICES={starter:process.env.STRIPE_PRICE_STARTER,pro:process.env.STRIPE_PRICE_PRO} as const;
app.post('/api/billing/checkout',auth,async(req,res)=>{const plan=String(req.body.plan) as keyof typeof PRICES;if(!['starter','pro'].includes(plan)||!PRICES[plan])return res.status(400).json({error:'Plano indisponível'});if(!process.env.STRIPE_SECRET_KEY)return res.status(503).json({error:'Stripe não configurada'});const user:User=res.locals.user;const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);if(!user.stripeCustomerId){const customer=await stripe.customers.create({email:user.email,name:user.name,metadata:{userId:user.id}});user.stripeCustomerId=customer.id;}const session=await stripe.checkout.sessions.create({customer:user.stripeCustomerId,mode:'subscription',line_items:[{price:PRICES[plan]!,quantity:1}],subscription_data:{...(user.trialUsed?{}:{trial_period_days:14}),metadata:{userId:user.id,plan}},metadata:{userId:user.id,plan},success_url:`${APP_URL}/planos?status=sucesso`,cancel_url:`${APP_URL}/planos?status=cancelado`,allow_promotion_codes:true});res.json({url:session.url});});
app.post('/api/billing/portal',auth,async(_req,res)=>{const user:User=res.locals.user;if(!process.env.STRIPE_SECRET_KEY||!user.stripeCustomerId)return res.status(400).json({error:'Assinatura não encontrada'});const session=await new Stripe(process.env.STRIPE_SECRET_KEY).billingPortal.sessions.create({customer:user.stripeCustomerId,return_url:`${APP_URL}/planos`});res.json({url:session.url});});
app.get('/api/health',(_req,res)=>res.json({ok:true}));
app.listen(PORT,()=>console.info(`Flowly API: http://localhost:${PORT}`));
