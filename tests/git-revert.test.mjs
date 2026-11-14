/** AC10: real git branch -> UI-only edit commit -> revert -> original SHA-256 restored.
 * An isolated temporary test repository is used; user GitHub main/prod is not changed. */
import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const hex=x=>createHash('sha256').update(x).digest('hex');
test('AC10 real Git branch, explicit UI-only commit, and non-force revert recovers exact original',async()=>{
 const root=await mkdtemp(join(tmpdir(),'ffax-git-revert-'));
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 try{
  git('init','-b','main');git('config','--local','user.name','FFAX Fixture QA');git('config','--local','user.email','ffax-qa@example.invalid');git('config','--local','core.autocrlf','false');
  await mkdir(join(root,'src','ui'),{recursive:true});await writeFile(join(root,'src','ui','theme.css'),':root {--primary: blue;}\n');
  const before=await readFile(join(root,'src','ui','theme.css'));
  git('add','.');git('commit','-m','fixture: original UI');const baseline=git('rev-parse','HEAD');
  git('switch','-c','feature/ui-review');await writeFile(join(root,'src','ui','theme.css'),':root {--primary: violet;}\n');
  git('add','src/ui/theme.css');git('commit','-m','test: proposed UI-only change');const changed=git('rev-parse','HEAD');
  assert.notEqual(baseline,changed);assert.notEqual(hex(await readFile(join(root,'src','ui','theme.css'))),hex(before));
  const altered=git('diff','--name-only',`${baseline}..${changed}`).split('\n');assert.deepEqual(altered,['src/ui/theme.css']);
  git('revert','--no-edit',changed);const reverted=git('rev-parse','HEAD');
  assert.notEqual(reverted,baseline);assert.notEqual(reverted,changed);assert.deepEqual(await readFile(join(root,'src','ui','theme.css')),before);
  assert.equal(git('status','--porcelain'),'');assert.equal(git('branch','--show-current'),'feature/ui-review');
  const hashes=git('show','--format=','--name-only','HEAD').trim().split('\n');assert.deepEqual(hashes,['src/ui/theme.css']);
  assert.equal(git('rev-parse','main'),baseline);
 }finally{await rm(root,{recursive:true,force:true});}
});
