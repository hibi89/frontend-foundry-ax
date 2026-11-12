# FFAX 화면 사용자 수락 체크리스트 (최종 승인 전용)

- 범위: **실제 FFAX 실행 화면**, `assets/concepts/ffax-v1-vision.webp` 같은 콘셉트 이미지가 아니다.
- 기준: 코드 SHA, 스크린샷 SHA, 375/768/1440px, 브라우저/OS, 검토자, 시간(KST)을 하나의 영수증으로 묶는다.
- 안전: 고객 원본·토큰·사설 저장소·실명/이메일 캡처를 공유하지 않는다.

## 사용자가 확인할 사항

1. 자연어 요구를 입력하고 2가지 시안 중 하나를 선택하면 중앙 캔버스가 변하는가?
2. 모바일 375px에서 글자/버튼/오른쪽 패널이 잘리거나 겹치지 않는가?
3. 컴포넌트를 클릭하고 텍스트/색상/간격을 바꿨을 때 의도대로 보이는가?
4. Undo/Redo와 시안 적용이 직관적이고 이전 버전을 되찾을 수 있는가?
5. AI 수동 복사/붙여넣기 기능이 **자동 전송/자동 배포가 아니라는 점**을 분명하게 설명하는가?
6. 시각적 계층·텍스트 대비·접근성·일관성·브랜드 인상이 최종 목적에 맞는가?
7. 코드 내보내기·변경 금지/기존 API 보존이 명확하게 표시되는가?

### 기록 형식

```text
source_code_sha:
OS / browser:
375/768/1440 screenshots (files + SHA256):
accessibility axe report (actual file+result):
keyboard/focus check:
UI reviewer:
reviewed_at_kst:
status: APPROVED | CHANGE_REQUIRED | NOT_REVIEWED
change_requests:
```

**판정 원칙:** 실제 사용자가 현재 구현 화면을 검토하고 명시적으로 APPROVED를 남기기 전에는 자동 검수 PASS만으로 AC-09(6점) 또는 RG-06 통과 처리 금지. 모델/개발자가 대신 승인했다고 기록하지 않는다.
