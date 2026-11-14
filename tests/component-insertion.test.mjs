import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newDocument,buildBrief,DocumentHistory,applyCommand,
  COMPONENT_TYPES,REGISTRY,exportReact,renderMarkup,exportLocalProject,importLocalProject
} from '../src/core.mjs';

const make=()=>newDocument(buildBrief('관리자 대시보드에서 프로젝트 목록과 차트를 보여줘. 기존 API는 보존'));
test('17 registry patterns insert deterministically and persist across project transfer',()=>{
 assert.equal(COMPONENT_TYPES.length,17);
 const a=new DocumentHistory(make()),b=new DocumentHistory(make());
 let expected=14;
 for(const type of COMPONENT_TYPES){
  assert.ok(REGISTRY[type]?.label);
  const prior=a.present.components.length;
  a.exec({kind:'insert',type});b.exec({kind:'insert',type});
  const item=a.present.components.at(-1);
  assert.equal(item.type,type);
  assert.equal(item.id,'node-'+expected++);
  assert.equal(a.present.components.length,prior+1);
  assert.deepEqual(a.present,b.present);
  assert.ok(renderMarkup(a.present).includes('data-node-id="'+item.id+'"'));
 }
 assert.equal(a.present.components.length,30);
 assert.equal(exportReact(a.present),exportReact(b.present));
 assert.deepEqual(importLocalProject(exportLocalProject(a.present)),a.present);
});
test('insert undo redo preserves same ID and exact React TSX output',()=>{
 const history=new DocumentHistory(make());
 const original=exportReact(history.present);
 history.exec({kind:'insert',type:'Chart'});
 const id=history.present.components.at(-1).id;
 const after=exportReact(history.present);
 assert.equal(id,'node-14');
 history.undo();
 assert.equal(exportReact(history.present),original);
 history.redo();
 assert.equal(history.present.components.at(-1).id,id);
 assert.equal(exportReact(history.present),after);
 history.exec({kind:'insert',type:'Form'});
 assert.equal(history.present.components.at(-1).id,'node-15');
});
test('nonconsecutive numeric and old random IDs cannot collide with new ones',()=>{
 const original=make(),old=structuredClone(original);
 old.components=old.components.filter(c=>!['node-3','node-9'].includes(c.id));
 old.components.push({...old.components[0],id:'node-40'});
 old.components.push({...old.components[0],id:'node-1700000000000-99999'});
 const n=applyCommand(old,{kind:'insert',type:'Sidebar'});
 assert.equal(n.components.at(-1).id,'node-41');
 assert.equal(new Set(n.components.map(c=>c.id)).size,n.components.length);
 assert.equal(new Set(old.components.map(c=>c.id)).size,old.components.length);
 assert.notDeepEqual(old,n);
});
test('inserting above 80 is refused without losing or mutating the current snapshot',()=>{
 const history=new DocumentHistory(make());
 while(history.present.components.length<80)history.exec({kind:'insert',type:'Card'});
 const snapshot=exportLocalProject(history.present),prior=history.past.length;
 assert.equal(history.present.components.length,80);
 assert.throws(()=>history.exec({kind:'insert',type:'Card'}),/COMPONENT_LIMIT_REACHED/);
 assert.equal(exportLocalProject(history.present),snapshot);
 assert.equal(history.past.length,prior);
 history.exec({kind:'remove',id:history.present.components.at(-1).id});
 history.exec({kind:'insert',type:'Error'});
 assert.equal(history.present.components.length,80);
 assert.equal(new Set(history.present.components.map(c=>c.id)).size,80);
});
test('unknown registry type cannot insert or change original',()=>{
 const doc=make(),before=JSON.stringify(doc);
 assert.throws(()=>applyCommand(doc,{kind:'insert',type:'script'}),/등록되지 않은/);
 assert.equal(JSON.stringify(doc),before);
});
