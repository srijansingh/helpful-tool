import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePageRanges,stringifyPageRanges} from '../src/lib/pdf/pageRanges.ts';
import {validateFiles} from '../src/lib/importFiles.ts';
test('ranges are bounded before iterating and deduplicated',()=>{assert.deepEqual(parsePageRanges('1-999999999999,3,0',3),[0,1,2]);assert.deepEqual(parsePageRanges('3-1',3),[0,1,2]);assert.equal(stringifyPageRanges([2,0,1,1,4]),'1-3,5');});
test('wrong file content is rejected even with a PDF filename',async()=>{await assert.rejects(validateFiles([new File(['not a PDF'],'fake.pdf',{type:'application/pdf'})],'application/pdf'),/choose/i);});
test('PDF content is accepted without a MIME type and normalized',async()=>{const result=await validateFiles([new File(['%PDF-1.7 sample'],'sample.pdf')],'application/pdf');assert.equal(result[0].type,'application/pdf');});
test('single-file tools reject multiple dropped files',async()=>{await assert.rejects(validateFiles([new File(['%PDF-a'],'a.pdf'),new File(['%PDF-b'],'b.pdf')],'application/pdf',false),/one file/i);});
