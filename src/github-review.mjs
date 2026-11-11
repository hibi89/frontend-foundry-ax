/** GitHub pull-request review gate.
 * Requires explicitly injected authorized adapter; NEVER merges, pushes or deploys.
 * No token, cookie, customer code, or file bytes accepted as arguments.
 */
const sha40=/^[a-f0-9]{40}$/;
export function assertReviewPlan(plan){
  if (!plan || plan.schema!=='ffax-git-review-plan.v1' || !plan.reviewRequired || plan.mergeAllowed!==false || plan.deployAllowed!==false || !sha40.test(plan.sourceCommit||'') || !/^[-\w.]+\/[-\w.]+$/.test(plan.repo||'') || !/^feature\/[\w/-]+$/.test(plan.head||'') || !plan.base || plan.head===plan.base || !Array.isArray(plan.tests) || plan.tests.length<5 || plan.tests.some(t=>t.status!=='pass')) throw new Error('REVIEW_PLAN_INVALID');
}
export async function requestDraftPR({plan, approval, adapter}) {
  assertReviewPlan(plan);
  if (approval!=='APPROVE_CREATE_DRAFT_PR') throw new Error('OWNER_DRAFT_PR_APPROVAL_REQUIRED');
  if (!adapter || typeof adapter.getBranch!=='function' || typeof adapter.findOpenPR!=='function' || typeof adapter.createDraftPR!=='function') throw new Error('GITHUB_ADAPTER_REQUIRED');
  const [head,base]=await Promise.all([adapter.getBranch(plan.repo,plan.head),adapter.getBranch(plan.repo,plan.base)]);
  if(!sha40.test(head?.sha||'') || !sha40.test(base?.sha||'')) throw new Error('GITHUB_SHA_NOT_VERIFIED');
  if(head.sha!==plan.sourceCommit) throw new Error('GITHUB_HEAD_CHANGED');
  if(base.sha===head.sha) throw new Error('NO_DIFF');
  const existing=await adapter.findOpenPR(plan.repo,plan.head,plan.base);
  if(existing){if(!existing.draft || existing.merged)throw new Error('EXISTING_PR_NOT_DRAFT');return {number:existing.number,url:existing.url,draft:true,action:'reused',headSha:head.sha,baseSha:base.sha};}
  const result=await adapter.createDraftPR({repo:plan.repo,head:plan.head,base:plan.base,title:'FFAX UI workbench — draft for owner review (no merge)',body:`This is a review-only draft. No auto merge or deployment. Source SHA: ${head.sha}; review receipt ${plan.receiptId}; tests ${plan.tests.length} PASS.`,draft:true});
  if(!result?.draft || result.merged || !Number.isInteger(result.number)|| !/^https:\/\/github\.com\//.test(result.url||'')) throw new Error('GITHUB_PR_RESPONSE_INVALID');
  return {number:result.number,url:result.url,draft:true,action:'created',headSha:head.sha,baseSha:base.sha};
}
