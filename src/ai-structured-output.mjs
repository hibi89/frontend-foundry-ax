/** Strict review boundary is shared with the browser UI in core.mjs. No provider calls. */
import { parseModelDesign, buildBrief } from './core.mjs';
export { parseModelDesign };

export function makeLocalFixtureDesign(index, brief) {
  const objective = buildBrief(brief).objective;
  const fixtureTypes=['Navbar','Hero','Button','Card','Input','Table','Alert'];
  return JSON.stringify({schema:'ffax-model-design.v1',title:objective+' 검토용 '+(index+1),theme:index%2===0?'midnight':'daylight',layout:index%2===0?'stack':'grid',
    components:fixtureTypes.map((type,i)=>({type,text:type+' '+(index+1)+'-'+(i+1),spacing:16,color:i%2?'neutral':'accent',align:'start'}))});
}
