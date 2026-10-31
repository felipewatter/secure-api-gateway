import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import type { Config } from './config';
import { authenticate, authorize } from './auth';
import { RateLimiter } from './limiter';
const METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']);
function reply(res:ServerResponse,status:number,code:string){const data=Buffer.from(JSON.stringify({error:code}));res.writeHead(status,{'Content-Type':'application/json','Content-Length':data.length});res.end(data)}
async function body(req:IncomingMessage,max:number){const parts:Buffer[]=[];let size=0;for await(const chunk of req){const b=Buffer.from(chunk);size+=b.length;if(size>max)throw Error('too_large');parts.push(b)}return Buffer.concat(parts)}
async function responseBody(response:Response,max:number){if(!response.body)return Buffer.alloc(0);const reader=response.body.getReader();const parts:Buffer[]=[];let size=0;try{while(true){const {done,value}=await reader.read();if(done)break;const b=Buffer.from(value);size+=b.length;if(size>max){await reader.cancel().catch(()=>undefined);throw Error('too_large')}parts.push(b)}}finally{reader.releaseLock()}return Buffer.concat(parts)}
export function makeGateway(config:Config,logger:(event:Record<string,unknown>)=>void=(event)=>console.log(JSON.stringify(event))){
 const limiter=new RateLimiter(config.maxRequestsPerMinute);
 return createServer(async(req,res)=>{
 const requestId=randomUUID(),start=Date.now();let actorHash:string|null=null;
 res.setHeader('X-Request-ID',requestId);res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'");res.setHeader('Cache-Control','no-store');
 if((req.socket as typeof req.socket & {encrypted?:boolean}).encrypted)res.setHeader('Strict-Transport-Security','max-age=31536000');
 try{
 const method=req.method??'',target=new URL(req.url??'/','http://gateway.local'),pathname=target.pathname,origin=req.headers.origin;
 if(origin){if(!config.corsOrigins.has(origin)){reply(res,403,'origin_not_allowed');return}res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin')}
 if(pathname==='/health'&&method==='GET'){const data=Buffer.from('{"status":"ok"}');res.writeHead(200,{'Content-Type':'application/json','Content-Length':data.length});res.end(data);return}
 if(!pathname.startsWith('/api/')||pathname.includes('%')||pathname.includes('\\')||pathname.includes('//')||pathname.split('/').includes('..')){reply(res,404,'not_found');return}
 if(!limiter.allow(req.socket.remoteAddress??'unknown')){res.setHeader('Retry-After','60');reply(res,429,'rate_limited');return}
 if(method==='OPTIONS'){if(!origin){reply(res,400,'origin_required');return}const requested=req.headers['access-control-request-method'];if(!requested||!METHODS.has(requested)){reply(res,405,'method_not_allowed');return}const hs=(req.headers['access-control-request-headers']??'').toLowerCase().split(',').map(x=>x.trim()).filter(Boolean);if(hs.some(x=>!['authorization','content-type'].includes(x))){reply(res,400,'headers_not_allowed');return}res.setHeader('Access-Control-Allow-Methods','GET, HEAD, POST, PUT, PATCH, DELETE');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.setHeader('Access-Control-Max-Age','600');res.writeHead(204);res.end();return}
 if(!METHODS.has(method)){reply(res,405,'method_not_allowed');return}
 const principal=authenticate(req.headers.authorization,config);if(!principal){reply(res,401,'unauthorized');return}actorHash=principal.actorHash;
 if(!authorize(principal,pathname,config.routeRules)){reply(res,403,'forbidden');return}
 const len=req.headers['content-length'];if(len&&(!/^\d+$/.test(len)||Number(len)>config.maxBodyBytes)){reply(res,413,'request_too_large');return}
 let payload:Buffer;try{payload=await body(req,config.maxBodyBytes)}catch{reply(res,413,'request_too_large');return}
 const url=new URL(req.url!,config.upstream);if(url.origin!==config.upstream.origin){reply(res,400,'invalid_target');return}
 const outbound:Record<string,string>={'X-Request-ID':requestId,'X-Gateway-Subject':principal.sub};for(const k of ['accept','accept-language','content-type'] as const){const v=req.headers[k];if(typeof v==='string')outbound[k]=v}
 let upstream:Response;try{upstream=await fetch(url,{method,headers:outbound,body:['GET','HEAD'].includes(method)?undefined:payload,redirect:'manual',signal:AbortSignal.timeout(config.upstreamTimeoutMs),cache:'no-store'})}catch{reply(res,502,'upstream_unavailable');return}
 if(upstream.status>=300&&upstream.status<400){await upstream.body?.cancel();reply(res,502,'upstream_redirect_blocked');return}
 let data:Buffer;try{data=await responseBody(upstream,config.maxResponseBytes)}catch{reply(res,502,'upstream_response_invalid');return}
 for(const k of ['content-type','content-language','last-modified']){const v=upstream.headers.get(k);if(v)res.setHeader(k,v)}
 if(upstream.status===204||upstream.status===304){res.writeHead(upstream.status);res.end();return}
 res.setHeader('Content-Length',data.length);res.writeHead(upstream.status);res.end(method==='HEAD'?undefined:data)
 }catch{if(!res.headersSent)reply(res,500,'internal_error');else res.destroy()}
 finally{try{logger({timestamp:new Date().toISOString(),requestId,method:req.method,path:(req.url??'/').split('?')[0],status:res.statusCode,durationMs:Date.now()-start,actorHash})}catch{}}
 })
}
