/**
 * 대한민국 법제처 Open API 연동 모듈
 */

/**
 * Tauri HTTP API 또는 브라우저 표준 Fetch를 동적으로 지원하는 하이브리드 fetch 함수
 */
export async function crossFetch(url, options = {}) {
  if (window.__TAURI__ && window.__TAURI__.http) {
    try {
      const { fetch: tauriFetch, ResponseType } = window.__TAURI__.http;
      const method = options.method || 'GET';
      const headers = options.headers || {};
      
      // Request Body 처리
      let body;
      if (options.body) {
        body = {
          type: 'Text',
          payload: typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
        };
      }

      const response = await tauriFetch(url, {
        method,
        headers,
        body,
        responseType: ResponseType.Text
      });

      return {
        ok: response.ok,
        status: response.status,
        text: () => Promise.resolve(response.data),
        json: () => Promise.resolve(JSON.parse(response.data))
      };
    } catch (err) {
      console.warn("Tauri http.fetch 실패. 브라우저 fetch로 폴백합니다.", err);
    }
  }

  // 일반 브라우저 fetch
  const res = await fetch(url, options);
  return {
    ok: res.ok,
    status: res.status,
    text: () => res.text(),
    json: () => res.json()
  };
}

/**
 * XML 문서의 특정 태그 텍스트 값을 안전하게 추출하는 헬퍼 함수
 */
function getTagValue(element, tagName, defaultValue = '') {
  const el = element.getElementsByTagName(tagName)[0];
  if (!el) return defaultValue;
  // CDATA 섹션 지원
  if (el.childNodes && el.childNodes.length > 0) {
    let text = '';
    for (let i = 0; i < el.childNodes.length; i++) {
      text += el.childNodes[i].nodeValue || '';
    }
    return text.trim();
  }
  return el.textContent ? el.textContent.trim() : defaultValue;
}

/**
 * 1. 법령 검색 (lawSearch.do)
 */
export async function searchLaw(query, apiKey, display = 30) {
  if (!apiKey) throw new Error("법제처 API 인증키가 설정되지 않았습니다.");
  const url = `https://www.law.go.kr/DRF/lawSearch.do?OC=${apiKey}&target=law&query=${encodeURIComponent(query)}&type=XML&display=${display}`;
  
  try {
    const res = await crossFetch(url);
    if (!res.ok) throw new Error(`법제처 법령 검색 실패 (Status: ${res.status})`);
    
    const xmlText = await res.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    // 에러 페이지 감지
    if (xmlText.includes("<HTML>") || xmlText.includes("<html>")) {
      throw new Error("법제처 API 서버가 올바르지 않은 응답(HTML)을 반환했습니다. API 키나 서버 상태를 확인해주세요.");
    }

    const totalCnt = parseInt(getTagValue(xmlDoc, "totalCnt", "0"), 10);
    const lawNodes = xmlDoc.getElementsByTagName("law");
    const list = [];

    for (let i = 0; i < lawNodes.length; i++) {
      const node = lawNodes[i];
      list.push({
        name: getTagValue(node, "법령명한글", "알 수 없는 법령"),
        abbr: getTagValue(node, "법령약칭명"),
        lawId: getTagValue(node, "법령ID"),
        mst: getTagValue(node, "법령일련번호"),
        promDate: getTagValue(node, "공포일자"),
        effDate: getTagValue(node, "시행일자"),
        statusCode: getTagValue(node, "현행연혁코드"),
        lawType: getTagValue(node, "법령구분명")
      });
    }

    return { totalCnt, list };
  } catch (error) {
    console.error("searchLaw error:", error);
    throw error;
  }
}

/**
 * 2. 법령 상세 본문 조회 (lawService.do)
 */
export async function getLawBody(mst, apiKey) {
  if (!apiKey) throw new Error("법제처 API 인증키가 설정되지 않았습니다.");
  const url = `https://www.law.go.kr/DRF/lawService.do?OC=${apiKey}&target=law&MST=${mst}&type=XML`;

  try {
    const res = await crossFetch(url);
    if (!res.ok) throw new Error(`법제처 법령 상세조회 실패 (Status: ${res.status})`);

    const xmlText = await res.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");

    // 기본 정보 파싱
    const infoNode = xmlDoc.getElementsByTagName("기본정보")[0];
    const lawName = getTagValue(infoNode, "법령명_한글", "알 수 없는 법령");
    const lawId = getTagValue(infoNode, "법령ID");
    const promNo = getTagValue(infoNode, "공포번호");
    const promDate = getTagValue(infoNode, "공포일자");
    const effDate = getTagValue(infoNode, "시행일자");
    
    // 조문 리스트 파싱
    const articles = [];
    const articleNodes = xmlDoc.getElementsByTagName("조문단위");
    
    for (let i = 0; i < articleNodes.length; i++) {
      const node = articleNodes[i];
      const status = node.getAttribute("조문여부"); // "기존" 또는 "신설" 등
      
      const artKey = getTagValue(node, "조문키");
      const artNo = getTagValue(node, "조문번호");
      const artTitle = getTagValue(node, "조문제목");
      const artContent = getTagValue(node, "조문내용");
      
      // 항(Paragraph) 파싱
      const paragraphs = [];
      const paraNodes = node.getElementsByTagName("항");
      for (let j = 0; j < paraNodes.length; j++) {
        const pNode = paraNodes[j];
        const pNo = getTagValue(pNode, "항번호");
        const pContent = getTagValue(pNode, "항내용");
        
        // 호(Sub-paragraph) 파싱
        const items = [];
        const itemNodes = pNode.getElementsByTagName("호");
        for (let k = 0; k < itemNodes.length; k++) {
          const iNode = itemNodes[k];
          const iNo = getTagValue(iNode, "호번호");
          const iContent = getTagValue(iNode, "호내용");
          items.push({ iNo, iContent });
        }
        
        paragraphs.push({ pNo, pContent, items });
      }

      articles.push({
        status,
        artKey,
        artNo,
        artTitle,
        artContent,
        paragraphs
      });
    }

    // 마크다운 형식의 본문 텍스트 조립
    let markdown = `# ${lawName}\n\n`;
    markdown += `- **법령 ID**: ${lawId}\n`;
    markdown += `- **공포 번호 / 일자**: 제 ${promNo} 호 / ${promDate}\n`;
    markdown += `- **시행 일자**: ${effDate}\n\n`;
    markdown += `---\n\n`;

    articles.forEach(art => {
      markdown += `### ${art.artContent}\n`;
      if (art.paragraphs && art.paragraphs.length > 0) {
        art.paragraphs.forEach(p => {
          markdown += `  - ${p.pContent}\n`;
          if (p.items && p.items.length > 0) {
            p.items.forEach(item => {
              markdown += `    - ${item.iContent}\n`;
            });
          }
        });
      }
      markdown += `\n`;
    });

    return {
      lawName,
      lawId,
      promDate,
      effDate,
      articles,
      formattedText: markdown
    };
  } catch (error) {
    console.error("getLawBody error:", error);
    throw error;
  }
}

/**
 * 3. 판례 검색 (precSearch.do)
 */
export async function searchPrecedents(query, apiKey, display = 30) {
  if (!apiKey) throw new Error("법제처 API 인증키가 설정되지 않았습니다.");
  const url = `https://www.law.go.kr/DRF/precSearch.do?OC=${apiKey}&target=prec&query=${encodeURIComponent(query)}&type=XML&display=${display}`;

  try {
    const res = await crossFetch(url);
    if (!res.ok) throw new Error(`법제처 판례 검색 실패 (Status: ${res.status})`);

    const xmlText = await res.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");

    if (xmlText.includes("<HTML>") || xmlText.includes("<html>")) {
      throw new Error("법제처 API 서버가 올바르지 않은 응답(HTML)을 반환했습니다. API 키나 서버 상태를 확인해주세요.");
    }

    const totalCnt = parseInt(getTagValue(xmlDoc, "totalCnt", "0"), 10);
    const precNodes = xmlDoc.getElementsByTagName("prec");
    const list = [];

    for (let i = 0; i < precNodes.length; i++) {
      const node = precNodes[i];
      list.push({
        id: getTagValue(node, "판례일련번호"),
        title: getTagValue(node, "사건명", "알 수 없는 사건"),
        caseNumber: getTagValue(node, "사건번호"),
        date: getTagValue(node, "선고일자"),
        court: getTagValue(node, "법원명"),
        decisionType: getTagValue(node, "판결유형")
      });
    }

    return { totalCnt, list };
  } catch (error) {
    console.error("searchPrecedents error:", error);
    throw error;
  }
}

/**
 * 4. 판례 상세 본문 조회 (precService.do)
 */
export async function getPrecedentBody(id, apiKey) {
  if (!apiKey) throw new Error("법제처 API 인증키가 설정되지 않았습니다.");
  const url = `https://www.law.go.kr/DRF/precService.do?OC=${apiKey}&target=prec&ID=${id}&type=XML`;

  try {
    const res = await crossFetch(url);
    if (!res.ok) throw new Error(`법제처 판례 상세조회 실패 (Status: ${res.status})`);

    const xmlText = await res.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");

    const title = getTagValue(xmlDoc, "사건명", "알 수 없는 사건");
    const caseNumber = getTagValue(xmlDoc, "사건번호");
    const date = getTagValue(xmlDoc, "선고일자");
    const court = getTagValue(xmlDoc, "법원명");
    const decisionType = getTagValue(xmlDoc, "판결유형");
    const caseType = getTagValue(xmlDoc, "선고");
    
    // 주요 법률 텍스트 정보 파싱
    const holdings = getTagValue(xmlDoc, "판시사항");
    const summary = getTagValue(xmlDoc, "판결요지");
    const refs = getTagValue(xmlDoc, "참조조문");
    const refPrecs = getTagValue(xmlDoc, "참조판례");
    const content = getTagValue(xmlDoc, "판례내용");

    // 마크다운 형식으로 구성
    let markdown = `# [판례] ${title}\n\n`;
    markdown += `- **사건번호**: ${caseNumber}\n`;
    markdown += `- **선고일자**: ${date}\n`;
    markdown += `- **법원 / 판결유형**: ${court} / ${decisionType} (${caseType})\n\n`;
    markdown += `---\n\n`;

    if (holdings) {
      markdown += `## 📌 판시사항\n${holdings.replace(/\r\n|\n/g, '\n\n')}\n\n`;
    }
    if (summary) {
      markdown += `## 📋 판결요지\n${summary.replace(/\r\n|\n/g, '\n\n')}\n\n`;
    }
    if (refs) {
      markdown += `## 🔗 참조조문\n${refs.replace(/\r\n|\n/g, '\n\n')}\n\n`;
    }
    if (refPrecs) {
      markdown += `## 📜 참조판례\n${refPrecs.replace(/\r\n|\n/g, '\n\n')}\n\n`;
    }
    if (content) {
      markdown += `## 📝 판례내용 전문\n${content.replace(/\r\n|\n/g, '\n\n')}\n`;
    }

    return {
      id,
      title,
      caseNumber,
      date,
      court,
      decisionType,
      holdings,
      summary,
      refs,
      refPrecs,
      content,
      formattedText: markdown
    };
  } catch (error) {
    console.error("getPrecedentBody error:", error);
    throw error;
  }
}
