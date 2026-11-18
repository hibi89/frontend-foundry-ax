/* Local HTTP request UTF-8 decoder: bounded bytes, chunk-safe Korean text, invalid UTF-8 refused.
 * Never logs request bytes and never sends content to an external destination.
 */
export async function readBoundedUtf8(req,maxBytes,tooLargeCode,invalidUtf8Code){
 if(!Number.isSafeInteger(maxBytes)||maxBytes<1||typeof tooLargeCode!=='string'||typeof invalidUtf8Code!=='string')
  throw Error('HTTP_BODY_POLICY_INVALID');
 const decoder=new TextDecoder('utf-8',{fatal:true});
 let data='',size=0;
 for await(const part of req){
  const bytes=Buffer.isBuffer(part)?part:Buffer.from(part);
  size+=bytes.length;
  if(size>maxBytes)throw Error(tooLargeCode);
  try{data+=decoder.decode(bytes,{stream:true});}
  catch{throw Error(invalidUtf8Code);}
 }
 try{data+=decoder.decode();}
 catch{throw Error(invalidUtf8Code);}
 return data;
}
