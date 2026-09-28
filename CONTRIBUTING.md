# Contributing

## 개발

```bash
npm ci
npm run dev
```

## 제출 전 확인

```bash
npx playwright install chromium
npm run check
npm run pack:smoke
```

## 변경 기준

- `pause()`, `resume()`, `destroy()`나 탭 상태 처리를 바꾸면 해당 테스트도 갱신합니다.
- 사용자 문구는 HTML 대신 `textContent`로 넣습니다.
- 새 프리셋이나 효과를 추가하면 타입, 입력 검사, 데모, README를 함께 갱신합니다.
- 동작 줄이기 설정과 키보드 접근성을 유지합니다.

변경 범위와 실행한 테스트를 PR에 적어 주세요. 동작이 바뀌면 테스트와 문서도 함께 수정합니다.
