# FFAX Windows 소유자 검수용 (2026-11-14 KST)

**정식 판매/릴리스 아님 · RELEASE HOLD · 공식 최종설계 100점 재산정 대기**

1. GitHub Actions에서 `ffax-owner-review-unreleased` 아티팩트 ZIP을 다운로드하고, 그 안의 `FFAX-OWNER-REVIEW.zip`을 추가로 압축 해제합니다. `FFAX-OWNER-REVIEW` 폴더의 `START-FFAX.cmd`를 실행합니다. 윈도에 Node.js 20 이상이 설치되어 있어야 합니다. [Node.js 공식 설치](https://nodejs.org/en/download)
2. 웹브라우저에서 `http://127.0.0.1:4173`을 열어 실제 화면을 검토합니다. 프로그램 실행 콘솔을 닫으면 서버가 종료됩니다. **Production 사이트가 아니라 PC 로컬 실행**입니다.
3. 무료 AI가 필요하면 공식 Ollama Windows 배포본을 별도로 설치하고, PowerShell에서 `ollama pull qwen3:4b-instruct` 실행 후 설치 상태를 확인합니다. 모델 약 2.5GB 다운로드, 현금 API 비용 0원. 다른 모델은 상용 라이선스 확인 전 허용하지 않습니다. [Ollama 공식 설치](https://ollama.com/download/windows)
4. **12문항 실제 모델 검증:** Ollama 설치·모델 다운로드 후, 압축 해제한 폴더의 `RUN-LIVE-MODEL-CHECK.cmd`를 더블클릭합니다. 공개 npm 패키지(React 19·TypeScript 등)를 인터넷에서 무료 설치한 뒤 **실제 모델** 12문항 → React 엄격 타입검사/SSR 렌더를 검사합니다. `FFAX-LIVE-MODEL-RESULT.json`이 같은 폴더에 생성됩니다. 실행 중 오류가 나면 JSON의 `passed/failed/typeErrors`를 확인해 전달합니다. `SOURCE_SHA.txt`와 함께 증거를 묶고, 비밀키·고객 실제 데이터는 공유하지 않습니다. 이 자동 결과는 **사용자 UX 최종 승인과 별개**입니다.
5. 테스트용 비민감 요구사항 입력 → 이번 PC 내부 추론 동의 → `PC 로컬 AI 시안 생성` → 반환된 JSON 검토 → 별도 승인 체크 후 시안 적용. 고객 실제 원본·계정정보·비밀키 입력 금지.
6. `프로젝트 JSON 저장`은 로컬 파일 다운로드만 수행합니다. 프로젝트 복원 시 명시적으로 승인해야 하며 GitHub 원본·Production에는 자동 적용되지 않습니다.
7. 사용자 화면 승인 전에는 공식 AC09/총 100점 달성을 인정하지 않습니다. 피드백은 휴대폰으로 채팅에 전달 가능하지만 실제 Windows 동선 검사는 PC에서만 가능합니다.

이 ZIP은 설치 프로그램(EXE)이 아닙니다. 모델 가중치·Node 실행 파일·고객 데이터·토큰을 포함하지 않습니다. `SOURCE_SHA.txt`의 SHA로 CI 원본을 추적합니다. 검수용 무료 배포이며 판매용 보증이 아닙니다.

## 문제시
- Node를 인식하지 못하면 공식 Node 설치를 확인합니다.
- 4173 포트 사용 중이면 기존 FFAX 프로세스를 종료합니다.
- `NPM_INSTALL_FAILED`면 인터넷/npm 설치 상태를 확인합니다. 공개 패키지 설치 외 유료 API 호출은 없습니다.
- `FFAX-LIVE-MODEL-RESULT.json` 파일만 있고 `passed` 값이 없으면 시험 중 실행 오류일 수 있으므로 PASS로 판정하지 않습니다.
- `LOCAL_MODEL_NOT_INSTALLED`면 Ollama가 실행 중이고 모델이 설치됐는지 확인합니다.
- 유료 외부 API·키·환경변수는 필요하지 않으며 임의로 새로 설정하지 않습니다.
