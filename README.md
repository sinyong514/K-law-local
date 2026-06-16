# ⚖️ 대한민국 법률/판례 AI 어시스턴트 (K-Law Assistant)

> **대한민국 법제처 Open API**와 **멀티 LLM(Gemini 3.5, GPT-4o, Claude 3.5)**을 크로스 플러그인 형태로 조율하여 법률 리서치 및 판례 유효성을 정밀 분석하는 **Windows 전용 독립형 데스크톱 애플리케이션**입니다.

Tauri(Rust)와 Vite + React를 융합하여 단 **2.5MB** 크기의 초경량 네이티브 실행 파일(`.exe` / `.msi`)로 컴파일되며, 백엔드 Rust HTTP 클라이언트를 타서 **CORS 제한을 완전히 무시하고 안전하게 외부 API를 다이렉트 호출**합니다.

---

## ✨ 핵심 기능 (Core Features)

### 1. 🔍 실시간 법령 검색 & 조문 뷰어
*   법제처 국가법령정보 Open API(`lawSearch.do` 및 `lawService.do`) 실시간 연동.
*   조문 데이터를 파싱하여 가독성 높은 마크다운 형태의 UI로 렌더링.
*   조회 중인 조문 본문을 클릭 한 번으로 **AI 법률 분석용 실시간 컨텍스트**에 바인딩.

### 2. 🛡️ 판례 Citator (생사 & 유효성 검증)
*   사건번호 또는 판례 요약 키워드로 판례 데이터 정밀 수집.
*   판결요지 내 "폐기", "변경", "대법원 전원합의체" 키워드를 휴리스틱 분석해 생사 여부를 계기판 대시보드로 요약.
*   **"AI로 유효성 검증"** 액션을 통한 관련 법리 흐름 및 무효화/대체 판결 추적 및 교차 검증.

### 3. 🔄 제정/개정 시점 비교 (Diff Viewer)
*   서로 다른 시점의 개정 전후 법령을 **조문 번호(예: 제1조) 단위로 정교하게 매핑**하는 커스텀 알고리즘 탑재.
*   **신설(Added - 초록색), 개정(Modified - 노란색), 삭제(Deleted - 빨간색)** 조항을 Side-by-Side 카드로 시각 대조.
*   개정 내용 요약 및 피규제자 영향 분석 리포트를 AI 프롬프트에 자동으로 포매팅하여 전송하는 기능 포함.

### 4. 💬 지능형 AI 대화 분석기 (Prompt Chain Chat)
*   채팅창 상단에서 사용할 모델을 실시간으로 전환 (Gemini 3.5/2.0 Flash, Gemini 3.5 Pro, GPT-4o, Claude 3.5 Sonnet).
*   **컨텍스트 스위치**가 켜져 있으면 현재 선택한 조문/판례 전체 텍스트가 사용자 질문 뒤에 프롬프트 체인으로 자동 조립되어 전송.

### 5. 🔒 로컬 보안 샌드박스 원칙 (LocalStorage)
*   사용자의 법제처 API 키 및 각 AI사의 API 키는 클라우드 서버를 거치지 않고 **오직 사용자의 PC 브라우저/Tauri 내부 로컬 저장소(LocalStorage)**에만 암호 마스킹 처리되어 완벽 보관.

### 🔌 API 네트워크 복원력 (Resilience)
*   구글 무료 티어 트래픽 폭주로 인한 **503(Service Unavailable)** 또는 **429(속도 제한)** 일시 장애 감지 시, 백그라운드에서 **지수 백오프(Exponential Backoff - 1초 → 2초 → 4초)** 간격으로 최대 3회 자동 재시도하여 대답을 결국 받아내는 내구성 탑재.

---

## 🛠️ 기술 스택 (Tech Stack)

*   **Frontend**: React (v18), Vite, Tailwind CSS, Lucide Icons, DOMParser
*   **Desktop Engine**: Tauri (v1.6) - Rust Core + Webview2
*   **Build System**: Rustup (MSVC Target v1.96), MSVC Visual Studio C++ Build Tools

---

## 🚀 로컬 빌드 및 패키징 가이드

### 1단계: 패키지 설치
프로젝트 폴더 내에서 Node.js 모듈을 설치합니다. (※ Node.js LTS 환경 필요)
```bash
npm install
```

### 2단계: 로컬 테스트 모드 실행
*   **웹 개발 서버 (CORS 제한 발생 가능)**:
    ```bash
    npm run dev
    ```
*   **Tauri 데스크톱 앱 개발 모드 실행 (CORS 완전 해제)**:
    ```bash
    npm run tauri dev
    ```

### 3단계: 로고 기반 아이콘 셋 빌드
제공된 법률 저울 형태의 현대적 로고([`logo.png`](src-tauri/icons/logo.png))를 바탕으로 Tauri 윈도우 리소스용 전 규격 아이콘 세트(`icon.ico`, `icon.icns` 등)를 자동 빌드합니다.
```bash
npx tauri icon src-tauri/icons/logo.png
```

### 4단계: Windows 실행 파일(.exe / .msi) 최종 빌드 패키징
아래 한 줄의 명령어로 컴파일을 진행하면 `src-tauri/target/release/bundle/nsis/` 폴더 내에 단일 실행 셋업 파일(`.exe`)이 추출 완성됩니다.
```bash
npm run tauri build
```

---

## ⚙️ 설정 가이드 (API Credentials)
프로젝트 실행 후 왼쪽 아래 **설정(톱니바퀴)** 탭에서 아래 키들을 등록한 뒤 **[설정 저장]**을 완료하셔야 정상 작동합니다.
*   **대한민국 법제처 Open API 인증키(OC)**: [법제처 공동활용 가이드](https://open.law.go.kr/)에서 발급받으실 수 있습니다.
*   **AI API Credentials**: OpenAI, Anthropic, Google AI Studio에서 각각 발급받으신 개인 키를 입력합니다.

---

## 👥 팀원 배포 및 사용자 가이드 (Distribution & User Guide)
본 프로그램은 팀원들과 손쉽게 공유하여 각자 독립적인 환경으로 구동할 수 있도록 설계되었습니다. 개발 환경이 없는 일반 팀원(비개발자)들과 협업 시 아래 가이드라인을 따르십시오.

### 1. 일반 팀원(사용자) 배포 요령 (권장 🌟)
프로그램을 리서치 및 실무용으로 사용만 할 팀원들은 깃허브 소스코드 다운로드나 개발 도구(Node.js, Rust 등)를 설치할 필요가 **전혀 없습니다.**

1. **설치 파일 공유**: 빌드 완료된 `대한민국_법률_어시스턴트_1.0.0_x64-setup.exe` 또는 `.msi` 파일을 구글 드라이브, 드롭박스, 슬랙(Slack), 카카오톡 등으로 공유합니다.
   * *💡 팁: 본 GitHub 저장소 우측의 **Releases** 탭에 빌드 결과물 파일을 업로드(배포본 등록)한 뒤, 다운로드 링크를 팀원들에게 공유하는 방식을 가장 추천합니다.*
2. **원클릭 설치**: 공유받은 인스톨러 파일을 PC에서 **더블 클릭**하여 그대로 설치를 완료합니다.
3. **각자 개별 API 키 등록**: 설치된 프로그램을 실행한 뒤, 좌측 하단의 **설정(톱니바퀴)** 탭으로 이동하여 **[본인의 법제처 API 키]** 및 **[본인의 AI API 키]**를 입력하고 저장합니다.
   * *🔒 보안 참고: 모든 API 키는 각 사용자의 PC 내부 브라우저 저장소(`LocalStorage`)에만 안전하게 격리 보관되므로, 하나의 설치 파일로 배포하더라도 요금이나 보안 유출 염려 없이 각자 개별적으로 청구 및 안전 가동됩니다.*

---

## 📜 참고 및 출처 (Credits & Acknowledgements)
본 프로젝트는 대한민국 법제처 Open API 연동 및 판례 생사(Citator) 분석 구조 구현 시, 오픈소스 프로젝트인 **[chrisryugj/korean-law-mcp](https://github.com/chrisryugj/korean-law-mcp)** 서버의 유용한 로직과 아이디어를 적극 참고하고 영감을 받아 제작되었습니다. 훌륭한 대한민국 법률 특화 MCP 서버 기여에 깊이 감사드립니다.
