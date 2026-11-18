/* DF-02: deterministic offline recommendation rule pack.
 * FFAX-authored industry intent mappings; UI UX Pro Max MIT style taxonomy is
 * attribution/context, not copied fonts, CSS, data or a beauty-quality score.
 */
const STYLE_IDS=['editorial','structured','expressive'];
const source=Object.freeze({
 kind:'OFFLINE_FFAX_AUTHORED_RULES',version:'ffax-2.1-rules-1',
 research:{project:'nextlevelbuilder/ui-ux-pro-max-skill',
  repositorySha:'7436a6e0b6dc3add7c12d5b6ef1ccd3d410dd7fd',
  license:'MIT',use:'STYLE_TAXONOMY_REFERENCE_ONLY'},
 noRemoteRequests:true,licenseClaim:'NO_EXTERNAL_FONTS_OR_ASSETS_INCLUDED'
});
const profiles=Object.freeze([
 {category:'analytics',signal:/대시보드|dashboard|통계|analytics|관리자|admin|분석|finance|금융/i,weights:{editorial:0,structured:7,expressive:0},reason:'데이터 탐색과 표·필터의 정보 계층'},
 {category:'tabular',signal:/테이블|datatable|spreadsheet|표(?:\s|$|[:·,./])|grid|결과목록/i,weights:{editorial:0,structured:6,expressive:0},reason:'밀도가 높은 데이터 영역'},
 {category:'enterprise',signal:/기업|업무|CRM|ERP|SaaS|B2B|운영|관리/i,weights:{editorial:2,structured:4,expressive:0},reason:'반복 업무에 필요한 구조적 탐색'},
 {category:'editorial-content',signal:/기사|매거진|잡지|독서|문서|에세이|editorial|publication|포트폴리오/i,weights:{editorial:6,structured:0,expressive:1},reason:'콘텐츠와 타이포그래피 가독성'},
 {category:'commerce',signal:/쇼핑|상품|구매|commerce|store|카탈로그|예약|booking/i,weights:{editorial:4,structured:3,expressive:1},reason:'상품·CTA와 정보 탐색의 균형'},
 {category:'culture',signal:/역학|달력|전통|문화|역사|예술|art|culture|사주|브랜드/i,weights:{editorial:2,structured:0,expressive:7},reason:'문화적 분위기·주목성·브랜드 인상'},
 {category:'campaign',signal:/캠페인|랜딩|이벤트|프로모션|landing|hero|launch/i,weights:{editorial:2,structured:0,expressive:5},reason:'핵심 행동과 히어로 영역 강조'},
 {category:'education',signal:/교육|강의|학습|학교|course|learning|tutorial/i,weights:{editorial:5,structured:2,expressive:1},reason:'읽기 편한 교육 콘텐츠와 단계적 탐색'},
 {category:'minimal-preference',signal:/미니멀|절제|스위스|minimal|심플|차분|간결|고급/i,weights:{editorial:3,structured:1,expressive:0},reason:'불필요한 장식을 줄이라는 사용자 취향'}
]);
const avoidProfiles=Object.freeze([
 {signal:/다크|검정|어두|dark/i,penalty:{structured:5,expressive:3}},
 {signal:/복잡|표|데이터|대시보드|카드|dashboard/i,penalty:{structured:4}},
 {signal:/화려|장식|그라데이션|금색|glow|gradient/i,penalty:{expressive:3}},
 {signal:/세리프|serif/i,penalty:{editorial:3}}
]);
const warnings={
 editorial:['본문 대비가 낮아지지 않게 확인','세리프 대체 폰트 사용 가능 여부 확인'],
 structured:['좁은 화면에서 표와 카드 넘침 확인','차트 수치를 실제 데이터로 오인하지 않게 표시'],
 expressive:['과도한 장식·그라데이션·글로우 지양','키보드 포커스/텍스트 대비 우선']
};
export function rankOfflineForgeStyles(brief){
 if(brief?.schema!=='ffax.design-brief.v2')throw Error('FORGE_STYLE_BRIEF_INVALID');
 const prompt=[brief.prompt,brief.mustHave,brief.audience].join(' ');
 const mood=String(brief.mood||'');
 const avoid=String(brief.avoid||'');
 const scores={editorial:2,structured:1,expressive:0};
 const signals={editorial:[],structured:[],expressive:[]};
 for(const rule of profiles){
  if(!rule.signal.test(prompt)&&!rule.signal.test(mood))continue;
  for(const id of STYLE_IDS)if(rule.weights[id]){
   scores[id]+=rule.weights[id];signals[id].push({category:rule.category,reason:rule.reason});
  }
 }
 for(const rule of avoidProfiles)if(rule.signal.test(avoid)){
  for(const [id,value] of Object.entries(rule.penalty))scores[id]-=value;
 }
 return STYLE_IDS.map(id=>({
  styleId:id,matchingRules:signals[id],matchedCategories:signals[id].map(x=>x.category),
  rationale:signals[id].length?signals[id].slice(0,2).map(x=>x.reason).join(' · '):
   '입력 업종을 확정할 근거가 부족해 기본 접근성·레이아웃 시안을 제시합니다.',
  antiPatterns:warnings[id],source,
  fallback:signals[id].length===0,confidence:'RULE_MATCH_ONLY_NOT_VISUAL_QUALITY',
  _rankingScore:scores[id]
 })).sort((a,b)=>b._rankingScore-a._rankingScore||STYLE_IDS.indexOf(a.styleId)-STYLE_IDS.indexOf(b.styleId))
 .map(({_rankingScore,...rest},i)=>({...rest,rank:i+1}));
}
