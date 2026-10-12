import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const dist=path.join(root,'dist');
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
// Explicit allowlist: private setup files, database migrations and server code cannot enter Pages.
for(const name of ['index.html','login.html','login.css','admin.html','admin.css','admin.js','css','js','math','poem','audio','img','favicon.ico','favicon64.ico','LICENSE'])
  await cp(path.join(root,name),path.join(dist,name),{recursive:true});
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
if(url || key){
  if(!url || !key || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url))throw Error('Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY together.');
  if(key.startsWith('sb_secret_'))throw Error('Server secret keys must never be published.');
  if(key.startsWith('eyJ')){
    const claims=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString());
    if(claims.role!=='anon')throw Error('Only an anon JWT is permitted in a public website.');
  }else if(!key.startsWith('sb_publishable_'))throw Error('Expected a publishable key.');
  await writeFile(path.join(dist,'js/config.js'),`window.HANZI_CONFIG = Object.freeze(${JSON.stringify({supabaseUrl:url,publishableKey:key})});\n`);
}
if(process.env.CI && !url)throw Error('Production build needs Supabase public configuration.');
await writeFile(path.join(dist,'.nojekyll'),'');
console.log('Built public website in dist.');
