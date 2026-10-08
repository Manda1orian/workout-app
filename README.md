# 맨몸 운동 (workout-app)

아이폰용 PWA. 풀업(암스트롱) · 푸시업(Hundred Pushups) · 스쿼트(Two Hundred Squats) 프로그램 트래커.

- 설치: Safari에서 https://manda1orian.github.io/workout-app/ 열기 → 공유 → 홈 화면에 추가
- 데이터는 기기 로컬(IndexedDB)에만 저장. 설정 → 백업에서 JSON 내보내기/가져오기.

## 개발

```
npm install
npm run dev
npm run build
```

`main`에 push하면 GitHub Actions가 GitHub Pages에 배포합니다.
