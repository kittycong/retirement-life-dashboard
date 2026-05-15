# 내 은퇴라이프 설계 대시보드

통합연금포털에서 확인한 국민연금, DC, IRP 조회값을 바탕으로 은퇴 필요자금과 추가저축액을 계산하는 정적 웹앱입니다.

## 파일

| 파일 | 설명 |
|---|---|
| `index.html` | 실행 화면 |
| `styles.css` | 대시보드 스타일 |
| `app.js` | 계산 로직, 그래프, 입력 상태 관리 |
| `data.js` | 기본 연금 조회값 |
| `retirement-plan.md` | 전체 은퇴 설계 보고서 |

## 실행

브라우저에서 `index.html`을 열면 됩니다. 별도 서버나 빌드 과정은 필요하지 않습니다.

## 기본 조회값

| 항목 | 값 |
|---|---:|
| 국민연금 예상액 | 월 1,041,780원 |
| 국민연금 개시 | 2053년 |
| DC/IRP 적립금 합계 | 21,645,496원 |
| DB형 퇴직연금 | 없음 |
| 개인연금 | 없음 |

## GitHub Pages

정적 파일만 사용하므로 GitHub Pages에서 바로 배포할 수 있습니다. 저장소 생성 후 Pages Source를 `main` 브랜치의 root로 설정하면 됩니다.

## Google Sheets 연동

정적 GitHub Pages에서 Google Sheets에 직접 쓰지 않고, Google Apps Script 웹앱을 중간 엔드포인트로 사용합니다.

1. Google Sheet에서 `확장 프로그램 > Apps Script`를 엽니다.
2. `google-apps-script.js` 내용을 Apps Script 편집기에 붙여넣습니다.
3. `배포 > 새 배포 > 웹 앱`을 선택합니다.
4. 실행 사용자: `나`, 액세스 권한: `나` 또는 필요한 범위로 설정합니다.
5. 생성된 `/exec` URL을 대시보드의 `Apps Script 웹앱 URL` 입력칸에 넣습니다.
6. `시트 저장` 또는 `시트 불러오기`로 동기화합니다.

연동용 Google Sheet 탭 구조는 `Settings`, `Accounts`, `Scenarios`, `Summary`, `Snapshots`입니다.
