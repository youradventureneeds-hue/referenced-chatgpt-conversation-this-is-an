export const DOCUMENT_BYTES=3*1024*1024;
export const DOCUMENT_TOTAL_BYTES=20*1024*1024;
export const CERTIFICATE_LIMIT=10;
export function validateCandidateDocument({kind,name,type,bytes}){
 if(!['CV','CERTIFICATION'].includes(kind))throw Error('Choose a CV or certification.');
 if(!bytes.length||bytes.length>DOCUMENT_BYTES)throw Error('Each document must be between 1 byte and 3 MB.');
 const pdf=bytes.subarray(0,5).toString()==='%PDF-';
 const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 const jpg=bytes.length>3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const ext=String(name).split('.').pop()?.toLowerCase();
 const mime=pdf&&ext==='pdf'?'application/pdf':png&&ext==='png'?'image/png':jpg&&['jpg','jpeg'].includes(ext)?'image/jpeg':null;
 if(!mime||type&&type!==mime||kind==='CV'&&mime!=='application/pdf')throw Error(kind==='CV'?'Upload your CV as a PDF.':'Upload a certificate as a PDF, JPG, or PNG.');
 const filename=String(name).normalize('NFKC').replace(/[\x00-\x1f\x7f/\\"<>]/g,'_').slice(-150);
 return {kind,filename,mimeType:mime,size:bytes.length,content:bytes};
}
export async function readDocumentForm(request){
 if(!request.headers.get('content-type')?.startsWith('multipart/form-data;'))throw Error('Choose a document to upload.');
 const limit=DOCUMENT_BYTES+65536;if(Number(request.headers.get('content-length')||0)>limit)throw Error('Each document must be no larger than 3 MB.');
 const reader=request.body?.getReader();if(!reader)throw Error('Choose a document to upload.');let size=0;const chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw Error('Each document must be no larger than 3 MB.');}chunks.push(value);}}finally{reader.releaseLock();}
 return new Response(Buffer.concat(chunks),{headers:{'Content-Type':request.headers.get('content-type')}}).formData();
}
