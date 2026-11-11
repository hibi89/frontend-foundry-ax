import React, { useState } from 'react';
import { createMarketService } from './service.mjs';
import './ui/theme.css';
export function App({ transport, session }: { transport: (path:string, data?:unknown)=>Promise<unknown>, session: {userId:string, approver:boolean} }){
  const client=createMarketService(transport,session);const [query,setQuery]=useState('');const [output,setOutput]=useState('');
  return <main className="market"><h1>Talent Market</h1><input aria-label="Search talent" value={query} onChange={e=>setQuery(e.target.value)} />
    <button onClick={async()=>setOutput(JSON.stringify(await client.search(query)))}>Search</button>
    <button onClick={async()=>setOutput(JSON.stringify(await client.profile(1)))}>Profile</button>
    <button onClick={async()=>setOutput(JSON.stringify(await client.quote(1,150)))}>Quote</button>
    <button onClick={async()=>setOutput(JSON.stringify(await client.approve(5)))}>Approve</button>
    <button onClick={async()=>setOutput(JSON.stringify(await client.checkout(5)))}>Checkout</button>
    <output>{output}</output>
  </main>;
}
