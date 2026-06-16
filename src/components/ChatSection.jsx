import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Bot, User, Sparkles, RefreshCw, FileText } from 'lucide-react';
import { callLLM } from '../lib/llmApi';

export default function ChatSection({ selectedContext, apiKeys }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '안녕하세요! 대한민국 법률 어시스턴트입니다. 왼쪽에서 법령 또는 판례를 검색하신 후, "AI로 분석" 버튼을 누르거나 아래 스위치를 켜서 해당 본문을 참조하여 정밀한 법률 분석을 진행하실 수 있습니다.'
    }
  ]);
  
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-3.5-flash'); // Gemini 3.5 Flash 기본 지정
  const [includeContext, setIncludeContext] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef(null);

  const models = [
    { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', provider: 'gemini' },
    { id: 'gemini-3.5-pro', name: 'Gemini 3.5 Pro', provider: 'gemini' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'gemini' },
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
    { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet', provider: 'anthropic' }
  ];

  const activeModel = models.find(m => m.id === selectedModel);

  // 스크롤 아래로 고정
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // 외부(검색창)에서 컨텍스트 강제 주입 시 채팅에 안내 메시지 추가
  useEffect(() => {
    if (selectedContext) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `💡 분석 컨텍스트로 [${selectedContext.title}]이(가) 선택되었습니다. 이제 질문하시면 해당 내용을 기반으로 분석합니다.`,
          isSystemNotice: true
        }
      ]);
    }
  }, [selectedContext]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessageContent = input.trim();
    setInput('');
    setIsLoading(true);

    // 1. 화면에 사용자 메시지 추가
    const newMessages = [...messages, { role: 'user', content: userMessageContent }];
    setMessages(newMessages);

    try {
      // 2. 프롬프트 체인 구성 (컨텍스트가 있는 경우 조문 본문을 프롬프트 뒤에 바인딩)
      let finalPrompt = userMessageContent;
      if (includeContext && selectedContext) {
        finalPrompt = `[참조 법률/판례 정보: ${selectedContext.title}]\n${selectedContext.text}\n\n[사용자 질문]\n${userMessageContent}`;
      }

      // API 호출용 대화 이력 빌드
      // 프롬프트 체인을 위해 마지막 유저 질문에 컨텍스트를 묶어 전달함
      const apiHistory = messages
        .filter(m => !m.isSystemNotice) // 시스템 알림 메시지 제외
        .map(m => ({
          role: m.role,
          content: m.content
        }));
      
      apiHistory.push({ role: 'user', content: finalPrompt });

      const systemPrompt = `당신은 대한민국 법률 및 판례를 고도로 정밀하게 분석하는 법률 전문 AI 어시스턴트입니다.
제공된 법령 텍스트나 판례의 요지를 꼼꼼히 파악하고 분석하여 사용자의 질문에 답하십시오.
반드시 아래 규칙들을 준수하십시오:
1. 답변은 객관적이며 명확한 법률적 근거(조문 번호, 판례 번호 등)를 제시해야 합니다.
2. 판례를 추측해서 지어내지 마십시오 (환각 현상 엄금). 판례가 확실하지 않거나 API 데이터에 없는 내용은 '검색할 수 없거나 확실하지 않음'을 정직하게 밝히고 지어내 답변하지 마십시오.
3. 법적 해석에 있어 지나치게 단정적인 언어보다는 '~로 판단될 가능성이 높습니다', '~를 참고할 필요가 있습니다' 등의 신중한 조언 형태로 작성하십시오.`;

      // 3. API 호출
      const aiResponse = await callLLM({
        provider: activeModel.provider,
        model: activeModel.id, // 모델 ID 스트링 전달
        chatHistory: apiHistory,
        systemPrompt,
        apiKeys
      });

      // 4. 화면에 AI 응답 추가
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);

    } catch (error) {
      console.error(error);
      setMessages(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: `❌ 오류가 발생했습니다: ${error.message}\n설정 탭에서 API 키를 확인하시거나 네트워크 상태를 점검해주세요.` 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    if (window.confirm("대화 기록을 초기화하시겠습니까?")) {
      setMessages([
        {
          role: 'assistant',
          content: '대화 기록이 초기화되었습니다. 분석할 내용을 질문해주세요.'
        }
      ]);
    }
  };

  return (
    <div className="w-[450px] border-l border-slate-800 bg-[#0d1321]/80 backdrop-blur-md flex flex-col h-full">
      {/* 채팅 헤더 */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-brand-400 animate-pulse" />
          <span className="font-bold text-sm text-white">AI 법률 분석기</span>
        </div>
        <div className="flex items-center space-x-2">
          {/* 멀티 LLM 선택 드롭다운 */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={isLoading}
            className="bg-[#0b0f19] border border-slate-700/60 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-brand-500 transition-premium cursor-pointer"
          >
            {models.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          {/* 초기화 버튼 */}
          <button
            onClick={handleClear}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-premium"
            title="대화 지우기"
          >
            <Trash2 className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => {
          if (msg.isSystemNotice) {
            return (
              <div key={index} className="flex justify-center">
                <span className="bg-brand-500/10 text-brand-400 border border-brand-500/20 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  <span>{msg.content}</span>
                </span>
              </div>
            );
          }

          const isAI = msg.role === 'assistant';
          return (
            <div key={index} className={`flex ${isAI ? 'justify-start' : 'justify-end'} items-start space-x-2.5`}>
              {isAI && (
                <div className="bg-brand-500/10 p-2 rounded-xl border border-brand-500/20 text-brand-400 mt-0.5">
                  <Bot className="h-4.5 w-4.5" />
                </div>
              )}
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  isAI
                    ? 'glass-panel text-slate-200 border border-slate-800'
                    : 'bg-brand-500 text-white rounded-tr-none shadow-lg shadow-brand-500/10'
                }`}
              >
                {msg.content}
              </div>
              {!isAI && (
                <div className="bg-brand-500/10 p-2 rounded-xl border border-brand-500/20 text-brand-400 mt-0.5">
                  <User className="h-4.5 w-4.5" />
                </div>
              )}
            </div>
          );
        })}

        {/* 로딩 표시 */}
        {isLoading && (
          <div className="flex justify-start items-start space-x-2.5">
            <div className="bg-brand-500/10 p-2 rounded-xl border border-brand-500/20 text-brand-400 mt-0.5">
              <Bot className="h-4.5 w-4.5" />
            </div>
            <div className="glass-panel text-slate-400 border border-slate-800 rounded-2xl px-4 py-3 text-sm flex items-center space-x-2">
              <RefreshCw className="h-4 w-4 animate-spin text-brand-400" />
              <span>AI가 법률 데이터를 분석하여 응답을 준비 중입니다...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="p-4 border-t border-slate-800/80 space-y-3 bg-[#0c111e]">
        {/* 컨텍스트 포함 토글 */}
        {selectedContext && (
          <div className="flex items-center justify-between bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/60">
            <div className="flex items-center space-x-2 overflow-hidden">
              <FileText className="h-4 w-4 text-brand-400 flex-shrink-0" />
              <span className="text-xs text-slate-300 truncate">참조: {selectedContext.title}</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeContext}
                onChange={(e) => setIncludeContext(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-slate-800 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-brand-500 peer-checked:after:bg-white"></div>
            </label>
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder={
              selectedContext && includeContext
                ? "참조된 법령을 기준으로 질문해 주세요..."
                : "법률 분석에 필요한 내용을 입력해 주세요..."
            }
            className="flex-1 bg-[#0d1321] border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-premium"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-brand-500 hover:bg-brand-600 disabled:bg-slate-800/80 disabled:text-slate-600 text-white p-3 rounded-xl transition-premium shadow-lg shadow-brand-500/10 flex-shrink-0"
          >
            <Send className="h-4.5 w-4.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
