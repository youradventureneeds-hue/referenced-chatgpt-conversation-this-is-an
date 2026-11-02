import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCandidateDocument,readDocumentForm,DOCUMENT_BYTES} from '../lib/candidate-documents.mjs';
const pdf=Buffer.from('%PDF-1.7\nFixture CV\n%%EOF');
test('document signatures, file types, sizes and filenames are validated',()=>{
 const input={kind:'CV',name:'../private\ncv.pdf',type:'application/pdf',bytes:pdf};
 const result=validateCandidateDocument(input);assert.equal(result.mimeType,'application/pdf');assert.equal(result.size,pdf.length);assert.equal(result.filename.includes('\n'),false);assert.equal(result.filename.includes('/'),false);
 for(const patch of [{kind:'ADMIN'},{name:'cv.html'},{type:'text/html'},{bytes:Buffer.from('<script>bad</script>')},{bytes:Buffer.alloc(0)},{bytes:Buffer.alloc(DOCUMENT_BYTES+1)}])assert.throws(()=>validateCandidateDocument({...input,...patch}));
 const png={kind:'CERTIFICATION',name:'qualification.png',type:'image/png',bytes:Buffer.from([137,80,78,71,13,10,26,10,1])};assert.equal(validateCandidateDocument(png).mimeType,'image/png');assert.throws(()=>validateCandidateDocument({...png,kind:'CV'}));
});
test('multipart streaming rejects oversized requests without trusting content length',async()=>{
 const form=new FormData();form.set('file',new File([pdf],'cv.pdf',{type:'application/pdf'}));form.set('kind','CV');const parsed=await readDocumentForm(new Request('https://test.local',{method:'POST',body:form}));assert.equal(parsed.get('file').name,'cv.pdf');
 const stream=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(DOCUMENT_BYTES+65537));controller.close();}});await assert.rejects(readDocumentForm(new Request('https://test.local',{method:'POST',headers:{'Content-Type':'multipart/form-data; boundary=fixture'},body:stream,duplex:'half'})),/3 MB/);
});
