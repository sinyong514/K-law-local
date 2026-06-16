import { crossFetch } from './lawApi';

/**
 * 멀티 LLM API 호출 통합 인터페이스
 * @param {string} provider - 'openai' | 'anthropic' | 'gemini'
 * @param {string} model - 실제 API 모델 식별자 (예: 'gpt-4o', 'gemini-1.5-flash-latest' 등)
 * @param {Array} chatHistory - { role: 'user' | 'assistant', content: string } 형식의 이전 대화
 * @param {string} systemPrompt - AI의 행동 및 분석 가이드라인 역할을 할 시스템 프롬프트
 * @param {object} apiKeys - { openai, anthropic, gemini } 형태의 API 키 목록
 */
export async function callLLM({ provider, model, chatHistory, systemPrompt, apiKeys }) {
  const messages = [...chatHistory];
  
  if (provider === 'openai') {
    const key = apiKeys.openai;
    if (!key) throw new Error("OpenAI API 키가 설정되지 않았습니다. 설정 탭에서 키를 입력해주세요.");
    
    const url = 'https://api.openai.com/v1/chat/completions';
    
    // GPT 형식에 맞춤 ({ role, content })
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }))
    ];

    const body = {
      model: model || 'gpt-5.5', // 2026년 GPT-5.5 디폴트 할당
      messages: formattedMessages,
      temperature: 0.3
    };

    const res = await crossFetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API 호출 실패 (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.choices[0].message.content;

  } else if (provider === 'anthropic') {
    const key = apiKeys.anthropic;
    if (!key) throw new Error("Anthropic API 키가 설정되지 않았습니다. 설정 탭에서 키를 입력해주세요.");

    const url = 'https://api.anthropic.com/v1/messages';
    
    // Claude 형식에 맞춤 (시스템 프롬프트는 body의 system 필드로 분리)
    const formattedMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

    const body = {
      model: model || 'claude-5-fable', // 2026년 Claude 5 Fable 디폴트 할당
      max_tokens: 4000,
      system: systemPrompt,
      messages: formattedMessages,
      temperature: 0.3
    };

    // Anthropic API는 브라우저 CORS 제한이 강력하여 Tauri Fetch를 통해서만 완벽히 지원됩니다.
    const res = await crossFetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API 호출 실패 (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.content[0].text;

  } else if (provider === 'gemini') {
    const key = apiKeys.gemini;
    if (!key) throw new Error("Google Gemini API 키가 설정되지 않았습니다. 설정 탭에서 키를 입력해주세요.");

    // 호출자가 지정한 동적 모델 식별자로 URL 조립 (예: gemini-1.5-flash-latest, gemini-2.5-flash 등)
    const targetModel = model || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1/models/${targetModel}:generateContent?key=${key}`;
    
    // systemInstruction 필드 파괴 에러 방지를 위해 대화 흐름 첫머리에 시스템 프롬프트를 가상 선주입
    const systemPromptMessage = [
      { role: 'user', parts: [{ text: `시스템 안내 및 분석 가이드라인:\n${systemPrompt}` }] },
      { role: 'model', parts: [{ text: "확인했습니다. 지정해주신 한국 법률 분석 가이드라인과 규칙에 맞추어 정확하게 분석을 진행하겠습니다. 질문하십시오." }] }
    ];

    const formattedContents = [
      ...systemPromptMessage,
      ...messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }))
    ];

    const body = {
      contents: formattedContents,
      generationConfig: {
        temperature: 0.3
      }
    };

    let res;
    let delay = 1000;
    const maxRetries = 3;

    for (let i = 0; i < maxRetries; i++) {
      res = await crossFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      // 503(일시적 부하) 또는 429(속도 제한)인 경우 지수 백오프 재시도
      if (res.status === 503 || res.status === 429) {
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // 대기 시간 2배로 증가 (1초 -> 2초 -> 4초)
          continue;
        }
      }
      break;
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API 호출 실패 (${res.status}): ${errText}`);
    }

    const data = await res.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      return data.candidates[0].content.parts[0].text;
    }
    
    throw new Error("Gemini API로부터 올바른 응답을 받지 못했습니다. 안전 필터링 등에 걸렸을 수 있습니다.");
  } else {
    throw new Error(`알 수 없는 AI 공급자: ${provider}`);
  }
}
