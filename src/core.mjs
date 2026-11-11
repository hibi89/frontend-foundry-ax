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
  Empty: { label: '빈 상태', text: '아직 프로젝트가 없습니다', tag: 'section' }
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
    const node = makeComponent(command.type, `node-${Date.now()}-${Math.floor(Math.random()*100000)}`);
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
    case 'Navbar': return `<nav ${attrs} aria-label="서비스 탐색">${tx}</nav>`;
    case 'Alert': return `<aside ${attrs} role="status">${tx}</aside>`;
    case 'Badge': return `<span ${attrs}>${tx}</span>`;
    case 'Tabs': return `<div ${attrs} role="group" aria-label="섹션 탭">${tx}</div>`;
    case 'Stat': return `<article ${attrs}><small>Example metric</small><strong>${tx}</strong></article>`;
    default: return `<article ${attrs}><strong>${tx}</strong><p>컴포넌트 스타일 미리보기</p></article>`;
  }
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
  const safe=doc.components.map(n=>{
    const text=escapeJSX(n.text);const s=`style={{ padding: ${n.spacing}, alignSelf: ${JSON.stringify(n.align)}, color: ${JSON.stringify(n.color==='accent'?accent:t.ink)} }}`;
    switch(n.type){
      case 'Button':return `<button type="button" ${s}>${text}</button>`;
      case 'Hero':return `<section ${s}><h1>${text}</h1></section>`;
      case 'Navbar':return `<nav ${s} aria-label="서비스 탐색">${text}</nav>`;
      case 'Input':return `<label ${s}><span>${text}</span><input aria-label={${JSON.stringify(n.text)}} placeholder={${JSON.stringify(n.text)}} /></label>`;
      case 'Table':return `<section ${s}><h2>${text}</h2><table><thead><tr><th>이름</th><th>상태</th></tr></thead><tbody><tr><td>Sample UI</td><td>Draft</td></tr></tbody></table></section>`;
      case 'Alert':return `<aside role="status" ${s}>${text}</aside>`;
      case 'Loader':return `<div role="status" ${s}>${text}</div>`;
      case 'Stat':return `<article ${s}><small>Example metric</small><strong>${text}</strong></article>`;
      default:return `<section ${s}>{${JSON.stringify(n.type)}}: ${text}</section>`;
    }
  }).join('\n      ');
  return `/** Generated by FFAX. Visual prototype export only. Review data/API integration before use. */\nimport React from 'react';\nexport default function GeneratedScreen(){\n  return (\n    <main className="ff-generated" data-theme=${JSON.stringify(doc.theme)} style={{backgroundColor:${JSON.stringify(t.surface)}, color:${JSON.stringify(t.ink)},display:'flex',flexDirection:'column',gap:16,padding:24}}>\n      ${safe}\n    </main>\n  );\n}\n`;
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
