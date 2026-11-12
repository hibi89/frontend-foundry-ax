/** Constrained AI-to-UI boundary. Never eval model output or execute generated JSX.
 * A model may only suggest registered component instances; no API, scripts, URLs,
 * project source files, credentials, or backend modifications are accepted here.
 * This module has no provider or network client.
 */
import { makeComponent, assertDocument, THEME_OPTIONS, REGISTRY, buildBrief, exportReact } from './core.mjs';

const OWN = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const text = (v, max) => typeof v === 'string' && v.length >= 1 && v.length <= max && !/[\u0000-\u0008\u000b\u000e-\u001f]/.test(v);
const keys = (o, allowed) => Object.keys(o).every(k => allowed.includes(k));

/** Parse an LLM's plain JSON, not Markdown or executable source. */
export function parseModelDesign(json, { ownerBrief, approval = '' } = {}) {
  if (approval !== 'APPROVE_DESIGN_PREVIEW') throw new Error('DESIGN_PREVIEW_APPROVAL_REQUIRED');
  if (!text(ownerBrief, 2000) || ownerBrief.trim().length < 8) throw new Error('OWNER_BRIEF_REQUIRED');
  if (typeof json !== 'string' || json.length > 50_000 || json.length < 20) throw new Error('MODEL_JSON_SIZE_INVALID');
  let data;
  try { data = JSON.parse(json); } catch { throw new Error('MODEL_JSON_PARSE_FAILED'); }
  if (!data || typeof data !== 'object' || Array.isArray(data) || !keys(data, ['schema','title','theme','layout','components'])) throw new Error('MODEL_SCHEMA_INVALID');
  if (data.schema !== 'ffax-model-design.v1' || !text(data.title, 100) || !OWN(THEME_OPTIONS, data.theme) || !['stack','grid'].includes(data.layout)) throw new Error('MODEL_SCHEMA_INVALID');
  if (!Array.isArray(data.components) || data.components.length < 1 || data.components.length > 40) throw new Error('MODEL_COMPONENTS_INVALID');
  const components = data.components.map((item,i) => {
    if (!item || typeof item !== 'object' || Array.isArray(item) || !keys(item,['type','text','color','spacing','align']) || !OWN(REGISTRY,item.type) || !text(item.text,180)) throw new Error('MODEL_COMPONENT_INVALID');
    const node = makeComponent(item.type, 'generated-' + (i+1), item.text);
    if (OWN(item,'color')) { if (!['accent','neutral'].includes(item.color)) throw new Error('MODEL_COLOR_INVALID'); node.color = item.color; }
    if (OWN(item,'spacing')) { if (![8,16,24,32].includes(item.spacing)) throw new Error('MODEL_SPACING_INVALID'); node.spacing = item.spacing; }
    if (OWN(item,'align')) { if (!['start','center','end'].includes(item.align)) throw new Error('MODEL_ALIGN_INVALID'); node.align = item.align; }
    return node;
  });
  const brief = buildBrief(ownerBrief);
  const doc = {version:1, title:data.title, theme:data.theme, layout:data.layout, approach:'MODEL',
    brief:{...brief, raw:'[owner-approved brief stored in local session only]'},
    reference:null, components};
  assertDocument(doc);
  return {document:doc, reactSource:exportReact(doc), metadata:{schema:data.schema, components:doc.components.length, ownerApproval:true,
    codeEvaluation:false, externalNetwork:false, directRepositoryWrite:false, sourceCopy:false}};
}

export function makeLocalFixtureDesign(index, brief) {
  const objective = buildBrief(brief).objective;
  const fixtureTypes=['Navbar','Hero','Button','Card','Input','Table','Alert'];
  return JSON.stringify({schema:'ffax-model-design.v1',title:objective+' 검토용 '+(index+1),theme:index%2===0?'midnight':'daylight',layout:index%2===0?'stack':'grid',
    components:fixtureTypes.map((type,i)=>({type,text:type+' '+(index+1)+'-'+(i+1),spacing:16,color:i%2?'neutral':'accent',align:'start'}))});
}
