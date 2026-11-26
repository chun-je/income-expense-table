# 가계부 · 소득지출대비표

날마다 쓰는 가계부와, 그 기록이 자동으로 합산되는 소득지출대비표 웹앱입니다.

- GitHub Pages (이 기기에만 저장): https://chun-je.github.io/income-expense-table/
- Vercel (기기 간 공유): 아래 순서로 배포한 주소

## Vercel로 기기 간 공유하기

1. **프로젝트 가져오기** — vercel.com → Add New → Project → `chun-je/income-expense-table` Import → Framework Preset은 `Other` 그대로 → Deploy
2. **DB 연결** — 프로젝트 → Storage → Create Database → **Upstash for Redis**(무료 플랜) → 이 프로젝트에 Connect
   - `KV_REST_API_URL`, `KV_REST_API_TOKEN` 환경 변수가 자동으로 생깁니다.
3. **비밀번호 추가** — Settings → Environment Variables → `APP_PASSWORD` = 길고 추측하기 어려운 비밀번호 (Production·Preview 모두)
4. **다시 배포** — Deployments → 최신 배포의 ⋯ → Redeploy (환경 변수는 재배포 후 적용)
5. 각 기기에서 `https://<프로젝트명>.vercel.app` 접속 → 비밀번호 입력

### 기존 데이터 옮기기
GitHub Pages 주소에서 쓰던 데이터는 그 주소의 브라우저에만 있습니다.
GitHub Pages 화면 맨 아래 **백업 · 복원 → 현재 데이터 복사** → Vercel 주소에서 **붙여넣은 데이터 적용**을 하면 서버로 올라가 다른 기기에도 보입니다.

### 동작 방식
- `api/data.js`(서버 함수)가 비밀번호를 확인하고 데이터를 Redis 한 곳에 저장합니다.
- 각 기기는 기록할 때마다 서버에 저장하고, 화면으로 돌아오거나 1분마다 최신 데이터를 받아옵니다.
- 두 기기가 거의 동시에 기록하면 가계부 기록은 합쳐지고(삭제도 반영), 설정(분류·비율·계좌)은 나중에 바꾼 쪽이 적용됩니다.
- 비밀번호는 이 저장소에 들어가지 않고 Vercel 환경 변수에만 있습니다. 저장소가 공개라도 데이터는 비밀번호 없이 읽을 수 없습니다.
