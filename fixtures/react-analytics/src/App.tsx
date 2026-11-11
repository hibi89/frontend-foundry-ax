import React, { useState } from 'react';
import { createAnalyticsService } from './service.mjs';
import './ui/theme.css';
export function App({ transport, session }: { transport: (path:string,data?:unknown)=>Promise<unknown>, session:{userId:string,canExport:boolean,isAuditor:boolean} }){
  const client=createAnalyticsService(transport,session);const [output,setOutput]=useState('');
  return <main className="analytics"><h1>Analytics Dashboard</h1>
    <button onClick={async()=>setOutput(JSON.stringify(await client.load()))}>Load</button>
    <button onClick={async()=>setOutput(JSON.stringify(await client.filter('open')))}>Filter</button>
    <button onClick={async()=>setOutput(JSON.stringify(await client.sort('desc')))}>Sort</button>
    <button onClick={async()=>setOutput(JSON.stringify(await client.export()))}>Export CSV</button>
    <button onClick={async()=>setOutput(JSON.stringify(await client.audit()))}>Audit</button>
    <output>{output}</output>
  </main>;
}
