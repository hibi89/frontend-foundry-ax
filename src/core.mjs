/* FFAX model: no network access, third-party services or injected HTML.
 * Only structured component input is accepted by the preview and exporter. */
export const THEME_OPTIONS = Object.freeze({
  midnight: { label: 'Midnight / Violet', surface: '#0f172a', accent: '#8b5cf6', ink: '#f8fafc', muted: '#a6b3ce' },
  ocean: { label: 'Ocean / Cyan', surface: '#0d2130', accent: '#06b6d4', ink: '#effaff', muted: '#b6d6df' },
  daylight: { label: 'Daylight / Indigo', surface: '#f8fafc', accent: '#4f46e5', ink: '#172033', muted: '#55637a' }
});
export const REGISTRY = Object.freeze({
  Hero: { label: '히어로', text: '새로운 아이디어를 현실로', tag: 'section' },
  Button: { label: '버튼', text: '시작하기', tag: 'button' },
  Card: { label: '카드', text: 'AI Workflow', tag: 'article' },
  Input: { label: '입력창', text: '서비스 검색', tag: 'input' },
  Table: { label: '테이블', text: '최근 프로젝트', tag: 'table' },
  Badge: { label: '배지', text: 'VERIFIED', tag: 'span' },
  Alert: { label: '알림', text: '안전한 검토가 필요합니다', tag: 'aside' },
  Navbar: { label: '네비게이션', text: '대시보드 · 프로젝트 · 설정', tag: 'nav' },
  Stat: { label: '통계', text: '24,328', tag: 'article' },
  Modal: { label: '모달', text: '계속 진행하시겠습니까?', tag: 'dialog' },
  Tabs: { label: '탭', text: '개요 · 데이터 · 결과', tag: 'div' },
  Loader: { label: '로딩', text: '검증 진행 중', tag: 'div' },
  Empty: { label: '빈 상태', text: '아직 프로젝트가 없습니다', tag: 'section' },
  Sidebar: { label: '사이드바', text: '대시보드 탐색', tag: 'nav' },
  Form: { label: '입력 폼', text: '이메일 주소', tag: 'section' },
  Chart: { label: '차트 컨테이너', text: '분석 추이', tag: 'figure' },
  Error: { label: '오류 상태', text: '데이터 연결을 확인하세요', tag: 'aside' }
});
export const COMPONENT_TYPES = Object.keys(REGISTRY);
export const DEFAULT_PROMPT = '글로벌 프리랜서 마켓플레이스를 고급 다크 테마로 만들어줘. 상품 검색, 회원 프로필, AI 협상 화면을 넣어줘. 결제 및 백엔드 API는 변경하지 마.';
const terms = [
  { key: /마켓|프리랜서|상품|shop|market/i, name: '마켓플레이스', pages: ['홈', '검색', '상품 상세', '프로필'] },
  { key: /RAG|문서|chat|챗봇/i, name: '문서 AI 워크스페이스', pages: ['문서 업로드', '질문과 답변', '출처'] },
  { key: /금융|주식|financ|증권|투자/i, name: '금융 분석', pages: ['대시보드', '시장 분석', '위험 요약'] },
  { key: /관리자|admin|직원|운영|CRM/i, name: '운영 관리', pages: ['대시보드', '고객 목록', '설정'] },
  { key: /데이터|통계|analytics|차트/i, name: '데이터 분석', pages: ['대시보드', '데이터 테이블', '분석 차트'] },
  { key: /교육|course|학습/i, name: '교육 서비스', pages: ['강좌 목록', '학습 페이지', '진도'] },
  { key: /예약|booking|calendar/i, name: '예약 서비스', pages: ['검색', '예약', '내 예약'] },
  { key: /부동산|property|매물/i, name: '부동산', pages: ['매물 검색', '매물 상세', '상담'] },
  { key: /의료|병원|health/i, name: '의료 업무', pages: ['일정', '환자 목록', '알림'] },
  { key: /프로젝트|project|팀|업무/i, name: '프로젝트 관리', pages: ['보드', '업무 상세', '활동'] },
  { key: /여행|travel|여정/i, name: '여행 계획', pages: ['목적지', '일정표', '예약'] },
  { key: /포트폴리오|portfolio|소개/i, name: '포트폴리오', pages: ['소개', '작업물', '연락처'] }
];
const limitText = (v, n = 2000) => String(v ?? '').trim().slice(0, n);
const uniq = a => [...new Set(a)];
const clone = v => JSON.parse(JSON.stringify(v));

export function buildBrief(prompt) {
  const raw = limitText(prompt, 2000);
  if (raw.length < 8) throw new Error('요구사항을 8자 이상 입력하세요.');
  const matches = terms.filter(t => t.key.test(raw));
  const primary = matches[0] || { name: '맞춤형 서비스', pages: ['홈', '상세', '설정'] };
  const pages = uniq([...matches.flatMap(t => t.pages), ...primary.pages]).slice(0, 7);
  const preserve = /변경하지|보존|유지|지키|without changing|preserve/i.test(raw);
  const constraints = ['백엔드 및 고객 데이터 자동 변경 금지', '승인 없는 GitHub push·Production 배포 금지'];
  if (preserve) constraints.push('기존 결제·인증·API 계약 유지');
  const theme = /밝|화이트|라이트|light/i.test(raw) ? 'daylight' : /바다|청록|cyan|ocean/i.test(raw) ? 'ocean' : 'midnight';
  const features = uniq([
    /검색|search/i.test(raw) ? '검색' : '',
    /프로필|profile/i.test(raw) ? '프로필' : '',
    /협상|negotiat/i.test(raw) ? '협상' : '',
    /차트|chart/i.test(raw) ? '차트' : '',
    /폼|form|입력/i.test(raw) ? '폼' : '',
    /결제|payment/i.test(raw) ? '결제 UI' : '',
    '반응형 레이아웃', '키보드 접근'
  ].filter(Boolean));
  return {
    objective: primary.name, raw, pages, features, constraints, theme,
    users: /고객|구매자|customer/i.test(raw) ? '구매자·운영자' : '최종 사용자·운영자',
    widthTargets: [375, 768, 1440],
    approvalRequired: true,
    approaches: [
      { id: 'A', label: 'A · Editorial', theme, layout: 'stack', description: '넓은 여백과 핵심 CTA 중심' },
      { id: 'B', label: 'B · Dashboard', theme: theme === 'daylight' ? 'ocean' : 'daylight', layout: 'grid', description: '정보 밀도가 높은 카드형 레이아웃' }
    ]
  };
}
export function makeComponent(type, id, text) {
  if (!REGISTRY[type]) throw new Error('등록되지 않은 컴포넌트');
  return { id, type, text: limitText(text ?? REGISTRY[type].text, 180), color: 'accent', spacing: 16, align: 'start' };
}
export function newDocument(brief = buildBrief(DEFAULT_PROMPT), approach = 'A') {
  if (!brief.approaches.some(a => a.id === approach)) throw new Error('디자인 시안 선택 오류');
  const chosen = brief.approaches.find(a => a.id === approach);
  const defaultTypes = chosen.layout === 'stack' ? ['Navbar', 'Hero', 'Input', 'Button', 'Stat', 'Card', 'Badge', 'Alert', 'Table', 'Tabs', 'Modal', 'Loader', 'Empty'] : ['Navbar', 'Hero', 'Stat', 'Card', 'Table', 'Button', 'Input', 'Tabs', 'Badge', 'Alert', 'Modal', 'Loader', 'Empty'];
  return {
    version: 1, title: brief.objective, theme: chosen.theme, layout: chosen.layout,
    approach, brief: clone(brief), reference: null,
    components: defaultTypes.map((type, i) => makeComponent(type, `node-${i + 1}`))
  };
}
export function assertDocument(doc) {
  if (!doc || !THEME_OPTIONS[doc.theme] || !['stack', 'grid'].includes(doc.layout)) throw new Error('프로젝트 테마/레이아웃 오류');
  if (!Array.isArray(doc.components) || doc.components.length > 80) throw new Error('컴포넌트 수가 유효하지 않습니다.');
  const ids = new Set();
  for (const node of doc.components) {
    if (!node.id || ids.has(node.id) || !REGISTRY[node.type] || !['start', 'center', 'end'].includes(node.align) || !['accent','neutral'].includes(node.color) || ![8,16,24,32].includes(node.spacing)) throw new Error('컴포넌트 구조가 유효하지 않습니다.');
    if (String(node.text).length > 180) throw new Error('컴포넌트 텍스트 한도 초과');
    ids.add(node.id);
  }
  return true;
}
export function applyCommand(doc, command) {
  assertDocument(doc);
  const next = clone(doc);
  const i = next.components.findIndex(n => n.id === command.id);
  if (command.kind === 'update') {
    if (i < 0 || !['text','color','spacing','align','type'].includes(command.prop)) throw new Error('편집할 항목이 없습니다.');
    const values = {text: v => typeof v === 'string' && v.length <= 180, color: v => ['accent','neutral'].includes(v), spacing: v => [8,16,24,32].includes(v), align: v => ['start','center','end'].includes(v), type: v => COMPONENT_TYPES.includes(v)};
    if (!values[command.prop](command.value)) throw new Error('지원하지 않는 컴포넌트 값');
    next.components[i][command.prop] = command.value;
  } else if (command.kind === 'move') {
    if (i < 0 || !Number.isInteger(command.index) || command.index < 0 || command.index >= next.components.length) throw new Error('이동 순서가 유효하지 않습니다.');
    const [node] = next.components.splice(i, 1);next.components.splice(command.index, 0, node);
  } else if (command.kind === 'insert') {
    if(next.components.length >= 80) throw new Error('COMPONENT_LIMIT_REACHED');
    // Deterministic, collision-free for the current document. The archive schema is unchanged.
    // Never derive IDs from wall-clock time or randomness: repeatable edits yield repeatable TSX.
    const used=new Set(next.components.map(node=>node.id));
    const greatest=next.components.reduce((max,node)=>{
      const match=/^node-(\d+)$/.exec(node.id);
      const value=match?Number(match[1]):0;
      return Number.isSafeInteger(value)?Math.max(max,value):max;
    },0);
    let candidate=greatest+1;
    if(!Number.isSafeInteger(candidate)) throw Error('COMPONENT_ID_EXHAUSTED');
    while(used.has('node-'+candidate)){
      if(candidate>=Number.MAX_SAFE_INTEGER)throw Error('COMPONENT_ID_EXHAUSTED');
      candidate++;
    }
    const node=makeComponent(command.type,'node-'+candidate);
    next.components.push(node);
  } else if (command.kind === 'remove') {
    if (i < 0) throw new Error('삭제 항목이 없습니다.');
    next.components.splice(i, 1);
  } else if (command.kind === 'theme') {
    if (!THEME_OPTIONS[command.value]) throw new Error('테마 선택 오류');
    next.theme = command.value;
  } else {throw new Error('지원하지 않는 명령');}
  next.version++;assertDocument(next);return next;
}
export class DocumentHistory {
  constructor(doc, max = 40) { assertDocument(doc);this.past=[];this.present=clone(doc);this.future=[];this.max=max; }
  exec(command) {
    if(command.kind==='update' && this.present.components.find(n=>n.id===command.id)?.[command.prop]===command.value) return this.present;
    if(command.kind==='theme' && this.present.theme===command.value) return this.present;
    if(command.kind==='move' && this.present.components.findIndex(n=>n.id===command.id)===command.index) return this.present;
    const next=applyCommand(this.present,command);this.past.push(this.present);if(this.past.length>this.max)this.past.shift();this.present=next;this.future=[];return this.present;
  }
  undo(){if(!this.past.length)return this.present;this.future.unshift(this.present);this.present=this.past.pop();return this.present;}
  redo(){if(!this.future.length)return this.present;this.past.push(this.present);this.present=this.future.shift();return this.present;}
}
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const escapeJSX = v => `{${JSON.stringify(String(v ?? ''))}}`;
export function renderNode(node) {
  const tx=escapeHtml(node.text); const cl=`ff-component ff-${node.type.toLowerCase()} ${node.color==='neutral'?'neutral':'accent'}`;
  const attrs=`class="${cl}" data-node-id="${escapeHtml(node.id)}" style="--gap:${node.spacing}px;align-self:${node.align};"`;
  switch(node.type){
    case 'Hero': return `<section ${attrs}><p class="eyebrow">AI × Human Interface</p><h1>${tx}</h1><p>다양한 아이디어를 실제 서비스 화면으로 구성합니다.</p></section>`;
    case 'Button': return `<button type="button" ${attrs}>${tx}</button>`;
    case 'Input': return `<label ${attrs}><span>${tx}</span><input type="search" aria-label="${tx}" placeholder="${tx}" /></label>`;
    case 'Table': return `<div ${attrs} role="region" aria-label="${tx}"><strong>${tx}</strong><table><thead><tr><th>이름</th><th>상태</th></tr></thead><tbody><tr><td>Sample UI</td><td>Draft</td></tr></tbody></table></div>`;
    case 'Modal': return `<section ${attrs} role="group" aria-label="${tx}"><strong>Dialog preview</strong><p>${tx}</p><button type="button" aria-label="확인">확인</button></section>`;
    case 'Loader': return `<div ${attrs} role="status"><span class="spinner" aria-hidden="true"></span>${tx}</div>`;
    case 'Empty': return `<section ${attrs}><span aria-hidden="true">◇</span><p>${tx}</p></section>`;
    case 'Sidebar': return `<nav ${attrs} aria-label="사이드바 탐색"><strong>${tx}</strong><ul class="ff-sidebar-list"><li><button type="button" data-demo-action="navigate" data-demo-section="개요" aria-current="page">개요</button></li><li><button type="button" data-demo-action="navigate" data-demo-section="프로젝트">프로젝트</button></li><li><button type="button" data-demo-action="navigate" data-demo-section="설정">설정</button></li></ul><p data-demo-status role="status" aria-live="polite">개요 선택됨 · 페이지 이동/API 요청 없음</p></nav>`;
    case 'Form': return `<section ${attrs} role="group" aria-label="${tx}"><label><span>${tx}</span><input data-demo-field type="text" maxlength="80" aria-label="${tx}" autocomplete="off" aria-invalid="false" /></label><button data-demo-action="validate-form" type="button">로컬 입력 검증</button><p data-demo-status role="status" aria-live="polite">미제출 · 서버 연결 없음</p></section>`;
    case 'Chart': return `<figure ${attrs} aria-label="${tx} - 예시 막대 차트"><figcaption>${tx} · 예시 데이터</figcaption><div class="ff-chart-bars" aria-hidden="true"><span style="height:35%"></span><span style="height:68%"></span><span style="height:52%"></span></div><table class="ff-chart-data" aria-label="차트 예시 수치"><thead><tr><th scope="col">기간</th><th scope="col">값</th></tr></thead><tbody><tr><td>A</td><td>35</td></tr><tr><td>B</td><td>68</td></tr><tr><td>C</td><td>52</td></tr></tbody></table></figure>`;
    case 'Error': return `<aside ${attrs} role="group" aria-label="예시 오류 상태"><strong>불러오기 오류</strong><p>${tx}</p><button data-demo-action="retry" type="button">로컬 다시 시도</button><p data-demo-status role="status" aria-live="polite">대기 · 실제 API에 연결되지 않았습니다.</p></aside>`;
    case 'Navbar': return `<nav ${attrs} aria-label="서비스 탐색">${tx}</nav>`;
    case 'Alert': return `<aside ${attrs} role="status">${tx}</aside>`;
    case 'Badge': return `<span ${attrs}>${tx}</span>`;
    case 'Tabs': return `<div ${attrs} role="group" aria-label="섹션 탭">${tx}</div>`;
    case 'Stat': return `<article ${attrs}><small>Example metric</small><strong>${tx}</strong></article>`;
    default: return `<article ${attrs}><strong>${tx}</strong><p>컴포넌트 스타일 미리보기</p></article>`;
  }
}
/** Explicit local JSON project handoff. No network, script execution or auto-apply. */
export const FFAX_PROJECT_SCHEMA = 'ffax-local-project.v1';
const plain = v => v !== null && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
const exactKeys = (v, allowed) => plain(v) && Object.keys(v).every(k => allowed.includes(k));
const safeLine = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max && !/[\u0000-\u001f\u007f]/.test(v);
const safeCollection = (xs, count, maxLength) => Array.isArray(xs) && xs.length <= count && xs.every(x => safeLine(x, maxLength));
const isColor = c => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
const briefKeys = ['objective','raw','pages','features','constraints','theme','users','widthTargets','approvalRequired','approaches'];
const referenceKeys = ['name','rightsConfirmed','origin','colors','candidates','reviewed','approvedCandidate','selectedColor'];
export function validateProjectImport(doc) {
  if (!exactKeys(doc, ['version','title','theme','layout','approach','brief','reference','components'])) throw new Error('PROJECT_STRUCTURE_INVALID');
  if (!Number.isSafeInteger(doc.version) || doc.version < 1 || doc.version > 1000000 || !safeLine(doc.title, 120) || !['stack','grid'].includes(doc.layout) || !Object.hasOwn(THEME_OPTIONS, doc.theme) || !['A','B','MODEL'].includes(doc.approach)) throw new Error('PROJECT_HEADER_INVALID');
  const b=doc.brief;
  if (!exactKeys(b, briefKeys) || !safeLine(b.objective, 120) || !safeLine(b.raw, 2000) || !safeLine(b.users, 120) || !Object.hasOwn(THEME_OPTIONS, b.theme) || b.approvalRequired !== true || !safeCollection(b.pages, 7, 120) || b.pages.length < 1 || !safeCollection(b.features, 30, 150) || !safeCollection(b.constraints, 30, 180) || !Array.isArray(b.widthTargets) || JSON.stringify(b.widthTargets) !== '[375,768,1440]') throw new Error('PROJECT_BRIEF_INVALID');
  if (!Array.isArray(b.approaches) || b.approaches.length !== 2 || b.approaches.some((a,i) => !exactKeys(a,['id','label','theme','layout','description']) || a.id !== ['A','B'][i] || !safeLine(a.label,100) || !safeLine(a.description,200) || !Object.hasOwn(THEME_OPTIONS,a.theme) || !['stack','grid'].includes(a.layout))) throw new Error('PROJECT_APPROACH_INVALID');
  const ref=doc.reference;
  if (ref !== null) {
    if (!exactKeys(ref,referenceKeys) || ref.rightsConfirmed !== true || !safeLine(ref.name,120) || !safeLine(ref.origin,120) || !Array.isArray(ref.colors) || ref.colors.length < 2 || ref.colors.length > 4 || !ref.colors.every(isColor) || !Array.isArray(ref.candidates) || ref.candidates.length !== 2 || typeof ref.reviewed !== 'boolean') throw new Error('PROJECT_REFERENCE_INVALID');
    for(let i=0;i<2;i++) {const c=ref.candidates[i];if(!exactKeys(c,['id','tone','color','layout']) || c.id!==['A','B'][i] || !['muted','vivid'].includes(c.tone) || !isColor(c.color) || !ref.colors.includes(c.color) || !['stack','grid'].includes(c.layout)) throw new Error('PROJECT_REFERENCE_INVALID');}
    if(ref.reviewed) {
      const selected=ref.candidates.find(c=>c.id===ref.approvedCandidate);
      if (!selected || ref.selectedColor!==selected.color || doc.layout!==selected.layout) throw new Error('PROJECT_REFERENCE_APPROVAL_INVALID');
    } else if(Object.hasOwn(ref,'selectedColor') || Object.hasOwn(ref,'approvedCandidate')) throw new Error('PROJECT_REFERENCE_UNAPPROVED');
  }
  if (!Array.isArray(doc.components) || doc.components.length > 80) throw new Error('PROJECT_COMPONENTS_INVALID');
  const ids=new Set();
  for(const c of doc.components){
    if (!exactKeys(c,['id','type','text','color','spacing','align']) || !safeLine(c.id,80) || !/^[A-Za-z0-9_-]+$/.test(c.id) || ids.has(c.id) || !Object.hasOwn(REGISTRY,c.type) || typeof c.text!=='string' || c.text.length>180 || /[\u0000-\u001f\u007f]/.test(c.text) || !['accent','neutral'].includes(c.color) || ![8,16,24,32].includes(c.spacing) || !['start','center','end'].includes(c.align)) throw new Error('PROJECT_COMPONENT_INVALID');
    ids.add(c.id);
  }
  assertDocument(doc);
  return true;
}
export function exportLocalProject(doc) {
  validateProjectImport(doc);
  return JSON.stringify({schema: FFAX_PROJECT_SCHEMA, project: doc}, null, 2);
}
export function importLocalProject(json) {
  if (typeof json !== 'string' || json.length > 262144 || json.length < 32) throw new Error('PROJECT_FILE_SIZE_INVALID');
  let archive;
  try {archive=JSON.parse(json);} catch {throw new Error('PROJECT_JSON_INVALID');}
  if (!exactKeys(archive,['schema','project']) || archive.schema!==FFAX_PROJECT_SCHEMA) throw new Error('PROJECT_SCHEMA_INVALID');
  validateProjectImport(archive.project);
  return clone(archive.project);
}

export function renderMarkup(doc) {
  assertDocument(doc);
  const t=THEME_OPTIONS[doc.theme];
  const accent=doc.reference?.reviewed && doc.reference.selectedColor ? doc.reference.selectedColor : t.accent;
  const cssVars=`--surface:${t.surface};--accent:${accent};--ink:${t.ink};--muted:${t.muted};`;
  return `<main class="ff-canvas theme-${doc.theme} layout-${doc.layout}" data-theme="${doc.theme}" style="${cssVars}" aria-label="프론트엔드 미리보기">${doc.components.map(renderNode).join('')}</main>`;
}
export function exportReact(doc){
  assertDocument(doc);
  const t=THEME_OPTIONS[doc.theme];
  const accent=doc.reference?.reviewed && doc.reference.selectedColor ? doc.reference.selectedColor : t.accent;
  const isGrid=doc.layout==='grid';
  // Preserve the approved layout in the exported TSX instead of always stacking.
  const containerLayout=isGrid
    ? "display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,300px),1fr))',alignContent:'start'"
    : "display:'flex',flexDirection:'column'";
  const safe=doc.components.map(n=>{
    const text=escapeJSX(n.text);
    const gridSpan=isGrid && ['Navbar','Hero','Table','Tabs'].includes(n.type) ? ",gridColumn:'1/-1'" : '';
    // The standalone TSX must reproduce the preview's actual design tokens.
    // No external FFAX stylesheet, third-party UI kit or customer build config is needed.
    const button=n.type==='Button';
    const ink=button?'#ffffff':t.ink;
    const surface=button?`color-mix(in srgb, ${accent} 60%, #0b1026)`:`color-mix(in srgb, ${t.surface} 83%, ${t.ink} 17%)`;
    const stroke=n.color==='neutral'?t.muted:`color-mix(in srgb, ${t.muted} 30%, transparent)`;
    const s=`style={{ padding: ${n.spacing}, alignSelf: ${JSON.stringify(n.align)}, color: ${JSON.stringify(ink)},minWidth:0,maxWidth:'100%',boxSizing:'border-box',overflowWrap:'anywhere',borderRadius:12,backgroundColor:${JSON.stringify(surface)},border:${JSON.stringify(button?'0':`1px solid ${stroke}`)},lineHeight:1.45${button?',fontWeight:700,cursor:\'pointer\'':''}${gridSpan} }}`;
    const inputStyle=`style={{display:'block',width:'100%',boxSizing:'border-box',marginTop:8,padding:9,borderRadius:6,backgroundColor:${JSON.stringify(t.surface)},color:${JSON.stringify(t.ink)},border:${JSON.stringify(`1px solid ${t.muted}`)}}}`;
    switch(n.type){
      case 'Button':return `<button type="button" ${s}>${text}</button>`;
      case 'Hero':return `<section ${s}><p>AI × Human Interface</p><h1>${text}</h1><p>다양한 아이디어를 실제 서비스 화면으로 구성합니다.</p></section>`;
      case 'Navbar':return `<nav ${s} aria-label="서비스 탐색">${text}</nav>`;
      case 'Input':return `<label ${s}><span style={{fontSize:11,color:${JSON.stringify(t.muted)}}}>${text}</span><input type="search" aria-label={${JSON.stringify(n.text)}} placeholder={${JSON.stringify(n.text)}} ${inputStyle} /></label>`;
      case 'Table':return `<div ${s} role="region" aria-label={${JSON.stringify(n.text)}}><strong>${text}</strong><table style={{width:'100%',fontSize:11,marginTop:10,borderCollapse:'collapse'}}><thead><tr><th scope="col" style={{textAlign:'left',padding:'8px 0',borderBottom:${JSON.stringify(`1px solid ${t.muted}`)}}}>이름</th><th scope="col" style={{textAlign:'left',padding:'8px 0',borderBottom:${JSON.stringify(`1px solid ${t.muted}`)}}}>상태</th></tr></thead><tbody><tr><td>Sample UI</td><td>Draft</td></tr></tbody></table></div>`;
      case 'Alert':return `<aside role="status" ${s}>${text}</aside>`;
      case 'Loader':return `<div role="status" ${s}><span aria-hidden="true">◌ </span>${text}</div>`;
      case 'Stat':return `<article ${s}><small style={{display:'block',fontSize:10,color:${JSON.stringify(t.muted)}}}>Example metric</small><strong style={{fontSize:22}}>${text}</strong></article>`;
      case 'Card':return `<article ${s}><strong>${text}</strong><p style={{fontSize:11,color:${JSON.stringify(t.muted)},fontWeight:400}}>컴포넌트 스타일 미리보기</p></article>`;
      case 'Badge':return `<span ${s}>${text}</span>`;
      case 'Modal':return `<section ${s} role="group" aria-label={${JSON.stringify(n.text)}}><strong>Dialog preview</strong><p style={{fontSize:11}}>${text}</p><button type="button" aria-label="확인" style={{backgroundColor:${JSON.stringify(`color-mix(in srgb, ${accent} 60%, #0b1026)`)},color:'#ffffff',border:0,borderRadius:6,padding:'7px 13px'}}>확인</button></section>`;
      case 'Tabs':return `<div ${s} role="group" aria-label="섹션 탭">${text}</div>`;
      case 'Empty':return `<section ${s}><span aria-hidden="true">◇</span><p>${text}</p></section>`;

       case 'Sidebar':return `<nav ${s} aria-label="사이드바 탐색"><strong>${text}</strong><ul style={{paddingLeft:18,marginBottom:0}}>{(['개요','프로젝트','설정'] as const).map(section=><li key={section}><button type="button" aria-current={(demoNav[${JSON.stringify(n.id)}]??'개요')===section?'page':undefined} onClick={()=>setDemoNav(prev=>({...prev,[${JSON.stringify(n.id)}]:section}))}>{section}</button></li>)}</ul><p role="status" aria-live="polite">{(demoNav[${JSON.stringify(n.id)}]??'개요')+' 선택됨 · 페이지 이동/API 요청 없음'}</p></nav>`;
       case 'Form':return `<section ${s} role="group" aria-label={${JSON.stringify(n.text)}}><label><span>${text}</span><input type="text" aria-label={${JSON.stringify(n.text)}} maxLength={80} autoComplete="off" value={demoInput[${JSON.stringify(n.id)}]??''} onChange={event=>setDemoInput(prev=>({...prev,[${JSON.stringify(n.id)}]:event.target.value}))} aria-invalid={(demoStatus[${JSON.stringify(n.id)}]??'').startsWith('2~')} ${inputStyle} /></label><button type="button" onClick={()=>setDemoStatus(prev=>({...prev,[${JSON.stringify(n.id)}]:(demoInput[${JSON.stringify(n.id)}]??'').trim().length>=2&&(demoInput[${JSON.stringify(n.id)}]??'').trim().length<=80?'로컬 입력 검증 PASS · 서버에 전송하지 않았습니다.':'2~80자의 예시 입력값을 입력하세요.'}))}>로컬 입력 검증</button><p role="status" aria-live="polite">{demoStatus[${JSON.stringify(n.id)}]??'미제출 · 서버 연결 없음'}</p></section>`;
       case 'Chart':return `<figure ${s} aria-label={${JSON.stringify(n.text+' - 예시 막대 차트')}}><figcaption>${text} · 예시 데이터</figcaption><div aria-hidden="true" style={{display:'flex',alignItems:'end',height:72,gap:8,marginTop:12}}><span style={{height:'35%',flex:1,backgroundColor:${JSON.stringify(accent)},borderRadius:4}} /><span style={{height:'68%',flex:1,backgroundColor:${JSON.stringify(accent)},borderRadius:4}} /><span style={{height:'52%',flex:1,backgroundColor:${JSON.stringify(accent)},borderRadius:4}} /></div><table aria-label="차트 예시 수치"><thead><tr><th scope="col">기간</th><th scope="col">값</th></tr></thead><tbody><tr><td>A</td><td>35</td></tr><tr><td>B</td><td>68</td></tr><tr><td>C</td><td>52</td></tr></tbody></table></figure>`;
       case 'Error':return `<aside ${s} role="group" aria-label="예시 오류 상태"><strong>불러오기 오류</strong><p>${text}</p><button type="button" onClick={()=>setDemoStatus(prev=>({...prev,[${JSON.stringify(n.id)}]:'로컬 재시도 시연 완료 · 외부 API 요청 없음'}))}>로컬 다시 시도</button><p role="status" aria-live="polite">{demoStatus[${JSON.stringify(n.id)}]??'대기 · 실제 API에 연결되지 않았습니다.'}</p></aside>`;
      default:throw new Error('지원하지 않는 React 컴포넌트');
    }
  }).join('\n      ');
  const demoHooks=doc.components.some(node=>['Form','Sidebar','Error'].includes(node.type))
    ? [
      '  const [demoInput,setDemoInput]=React.useState<Record<string,string>>({});',
      '  const [demoStatus,setDemoStatus]=React.useState<Record<string,string>>({});',
      '  const [demoNav,setDemoNav]=React.useState<Record<string,string>>({});'
    ].join('\\n')+'\\n'
    : '';
  return `/** Generated by FFAX. Visual prototype export only. Review data/API integration before use. */\nimport React from 'react';\nexport default function GeneratedScreen(){\n${demoHooks}  return (\n    <main className="ff-generated" data-theme=${JSON.stringify(doc.theme)} data-layout=${JSON.stringify(doc.layout)} style={{backgroundColor:${JSON.stringify(t.surface)}, color:${JSON.stringify(t.ink)},${containerLayout},gap:15,padding:20,minWidth:0,width:'100%',minHeight:380,boxSizing:'border-box',border:${JSON.stringify(`1px solid color-mix(in srgb, ${accent} 40%, transparent)`)},borderRadius:14,overflowWrap:'anywhere'}}>\n      ${safe}\n    </main>\n  );\n}\n`;
}
export function createReference(doc, imageName, rights, palette, origin='user-provided') {
  if (rights !== true) throw new Error('이미지 사용 권한 확인이 필요합니다.');
  if (!Array.isArray(palette) || palette.length < 2 || palette.some(s => !/^#[0-9a-f]{6}$/i.test(s))) throw new Error('색상 추출 실패');
  const next=clone(doc);
  next.reference={name:limitText(imageName,120),rightsConfirmed:true,origin:limitText(origin,120),colors:palette.slice(0,4),candidates:[{id:'A',tone:'muted',color:palette[0],layout:'stack'},{id:'B',tone:'vivid',color:palette[1],layout:'grid'}],reviewed:false};
  next.version++;
  return next;
}

export function approveReference(doc, candidateId) {
  assertDocument(doc);
  if(!doc.reference?.rightsConfirmed) throw new Error('권리 확인된 참고 이미지가 없습니다.');
  const candidate=doc.reference.candidates.find(c=>c.id===candidateId);
  if(!candidate) throw new Error('참고 이미지 후보가 없습니다.');
  const next=clone(doc);
  next.reference.reviewed=true;next.reference.approvedCandidate=candidateId;next.reference.selectedColor=candidate.color;next.layout=candidate.layout;
  next.version++;return next;
}

const OWN = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const text = (v, max) => typeof v === 'string' && v.length >= 1 && v.length <= max && !/[\u0000-\u0008\u000b\u000e-\u001f]/.test(v);
const keys = (o, allowed) => Object.keys(o).every(k => allowed.includes(k));

/** Parse an LLM's plain JSON, not Markdown or executable source. */
export function parseModelDesign(json, { ownerBrief, approval = '' } = {}) {
  if (approval !== 'APPROVE_DESIGN_PREVIEW') throw new Error('DESIGN_PREVIEW_APPROVAL_REQUIRED');
  if (!text(ownerBrief, 2000) || ownerBrief.trim().length < 8) throw new Error('OWNER_BRIEF_REQUIRED');
  if (typeof json !== 'string' || json.length > 50_000 || json.length < 20) throw new Error('MODEL_JSON_SIZE_INVALID');
  if (/(?:sk-[a-z0-9_-]{12,}|gh[opusr]_[a-z0-9_]{20,}|github_pat_[a-z0-9_]{20,}|AIza[a-z0-9_-]{20,}|-----BEGIN[^\n]*PRIVATE KEY-----|(?:secret|password|api[_-]?key|access[_-]?token|authorization)\s*[:=]\s*\S+|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b)/i.test(json)) throw new Error('SENSITIVE_MODEL_CONTENT_REFUSED');
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


/**
 * Local-only prompt packet. Owner may choose to copy ONLY a non-sensitive brief
 * into a separate model UI. This method performs zero network requests.
 */
export function makeManualAIPrompt(ownerBrief, {ownerConsent=false}={}) {
  if(ownerConsent!==true) throw new Error('MANUAL_COPY_CONSENT_REQUIRED');
  if(!text(ownerBrief,2000)||ownerBrief.trim().length<8) throw new Error('OWNER_BRIEF_REQUIRED');
  const risky=/(?:sk-[a-z0-9_-]{12,}|gh[opusr]_[a-z0-9_]{20,}|github_pat_[a-z0-9_]{20,}|AIza[a-z0-9_-]{20,}|-----BEGIN[^\n]*PRIVATE KEY-----|\.env\b|(?:secret|password|api[_-]?key|access[_-]?token|authorization)\s*[:=]\s*\S+|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|주민등록번호|비공개\s*소스)/i;
  if(risky.test(ownerBrief)) throw new Error('SENSITIVE_INPUT_REFUSED');
  return `당신은 UI 구조 JSON만 반환하는 도우미입니다. 요구사항: ${ownerBrief.trim()}\n\n반환 형식: 오직 JSON 객체(마크다운 코드블록 금지). schema는 \"ffax-model-design.v1\", theme은 midnight/ocean/daylight, layout은 stack/grid, title은 100자 이하. components는 1~40개로 구성하고 각 항목은 {\"type\":\"Card\",\"text\":\"설명\",\"color\":\"accent\",\"spacing\":16,\"align\":\"start\"} 형태. type 허용값: ${COMPONENT_TYPES.join(', ')}. 외부 URL, 스크립트, 인증정보, API 코드, 이미지, 실제 고객정보는 포함하지 마세요. 응답은 완성된 UI가 아니라 사용자가 검토할 구조화 초안입니다.`;
}
