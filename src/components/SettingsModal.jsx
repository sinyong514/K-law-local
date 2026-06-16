import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Save, ShieldCheck, Key, HelpCircle, Trash2 } from 'lucide-react';

export default function SettingsModal({ onSettingsChange }) {
  const [keys, setKeys] = useState({
    law: '',
    openai: '',
    anthropic: '',
    gemini: ''
  });

  const [showKeys, setShowKeys] = useState({
    law: false,
    openai: false,
    anthropic: false,
    gemini: false
  });

  const [isSaved, setIsSaved] = useState(false);

  // 로컬 스토리지에서 키 로드
  useEffect(() => {
    const savedLaw = localStorage.getItem('KLAW_LAW_API_KEY') || '';
    const savedOpenAI = localStorage.getItem('KLAW_OPENAI_API_KEY') || '';
    const savedAnthropic = localStorage.getItem('KLAW_ANTHROPIC_API_KEY') || '';
    const savedGemini = localStorage.getItem('KLAW_GEMINI_API_KEY') || '';

    setKeys({
      law: savedLaw,
      openai: savedOpenAI,
      anthropic: savedAnthropic,
      gemini: savedGemini
    });
  }, []);

  const handleChange = (provider, value) => {
    setKeys(prev => ({
      ...prev,
      [provider]: value
    }));
    setIsSaved(false);
  };

  const toggleVisibility = (provider) => {
    setShowKeys(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }));
  };

  const handleSave = () => {
    localStorage.setItem('KLAW_LAW_API_KEY', keys.law);
    localStorage.setItem('KLAW_OPENAI_API_KEY', keys.openai);
    localStorage.setItem('KLAW_ANTHROPIC_API_KEY', keys.anthropic);
    localStorage.setItem('KLAW_GEMINI_API_KEY', keys.gemini);
    
    setIsSaved(true);
    
    if (onSettingsChange) {
      onSettingsChange({
        law: keys.law,
        openai: keys.openai,
        anthropic: keys.anthropic,
        gemini: keys.gemini
      });
    }

    setTimeout(() => {
      setIsSaved(false);
    }, 2500);
  };

  const handleClear = () => {
    if (window.confirm("모든 API 키를 삭제하시겠습니까? 로컬 저장소에서 영구 제거됩니다.")) {
      localStorage.removeItem('KLAW_LAW_API_KEY');
      localStorage.removeItem('KLAW_OPENAI_API_KEY');
      localStorage.removeItem('KLAW_ANTHROPIC_API_KEY');
      localStorage.removeItem('KLAW_GEMINI_API_KEY');
      
      setKeys({
        law: '',
        openai: '',
        anthropic: '',
        gemini: ''
      });

      if (onSettingsChange) {
        onSettingsChange({
          law: '',
          openai: '',
          anthropic: '',
          gemini: ''
        });
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-[#0b0f19]">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Key className="h-6 w-6 text-brand-400" />
            <span>설정 및 API 키 관리</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            법률 검색 및 AI 대화에 필요한 API 인증키를 설정합니다. 모든 키는 본인 PC의 브라우저 로컬 저장소(LocalStorage)에만 안전하게 저장됩니다.
          </p>
        </div>

        {/* 안내 패널 */}
        <div className="glass-panel-light p-4 rounded-xl border border-emerald-500/10 bg-emerald-950/5 flex items-start space-x-3">
          <ShieldCheck className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-emerald-200/80 leading-relaxed">
            <strong className="text-emerald-300">로컬 보안 원칙:</strong> 입력하신 API 키는 절대 외부 클라우드나 타사 서버로 유출되지 않으며, 오직 PC 내부의 샌드박스화된 데이터 영역에 보관됩니다. 안심하고 키를 등록하셔도 됩니다.
          </div>
        </div>

        {/* 입력 폼 카드 */}
        <div className="glass-panel p-6 rounded-2xl space-y-6">
          {/* 법제처 API 키 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-slate-200 flex items-center space-x-1.5">
                <span>대한민국 법제처 Open API 인증키</span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md font-normal">필수</span>
              </label>
              <a 
                href="https://open.law.go.kr/LSO/openApi/guideResult.do" 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-brand-400 hover:text-brand-300 hover:underline flex items-center space-x-1"
              >
                <span>인증키 발급 가이드</span>
                <HelpCircle className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className="relative">
              <input
                type={showKeys.law ? 'text' : 'password'}
                value={keys.law}
                onChange={(e) => handleChange('law', e.target.value)}
                placeholder="법제처 국가법령정보 Open API 인증키(OC) 입력"
                className="w-full bg-[#0d1321] border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-premium pr-12"
              />
              <button
                type="button"
                onClick={() => toggleVisibility('law')}
                className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-premium"
              >
                {showKeys.law ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>

          <div className="border-t border-slate-800/80 my-4"></div>

          {/* AI 모델 키들 */}
          <h3 className="text-sm font-bold text-brand-400 uppercase tracking-wider">AI API Credentials (선택)</h3>

          {/* OpenAI API 키 */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-200">OpenAI API Key (GPT-4o 모델 구동)</label>
            <div className="relative">
              <input
                type={showKeys.openai ? 'text' : 'password'}
                value={keys.openai}
                onChange={(e) => handleChange('openai', e.target.value)}
                placeholder="sk-..."
                className="w-full bg-[#0d1321] border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-premium pr-12"
              />
              <button
                type="button"
                onClick={() => toggleVisibility('openai')}
                className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-premium"
              >
                {showKeys.openai ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>

          {/* Anthropic API 키 */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-200">Anthropic API Key (Claude 3.5 Sonnet 모델 구동)</label>
            <div className="relative">
              <input
                type={showKeys.anthropic ? 'text' : 'password'}
                value={keys.anthropic}
                onChange={(e) => handleChange('anthropic', e.target.value)}
                placeholder="sk-ant-..."
                className="w-full bg-[#0d1321] border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-premium pr-12"
              />
              <button
                type="button"
                onClick={() => toggleVisibility('anthropic')}
                className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-premium"
              >
                {showKeys.anthropic ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>

          {/* Google Gemini API 키 */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-200">Google Gemini API Key (Gemini Flash 모델 구동)</label>
            <div className="relative">
              <input
                type={showKeys.gemini ? 'text' : 'password'}
                value={keys.gemini}
                onChange={(e) => handleChange('gemini', e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-[#0d1321] border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-premium pr-12"
              />
              <button
                type="button"
                onClick={() => toggleVisibility('gemini')}
                className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-premium"
              >
                {showKeys.gemini ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center space-x-2 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 rounded-xl text-xs font-semibold transition-premium"
          >
            <Trash2 className="h-4 w-4" />
            <span>모든 키 초기화</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-bold transition-premium btn-glow ${
              isSaved
                ? 'bg-emerald-600 text-white'
                : 'bg-brand-500 hover:bg-brand-600 text-white'
            }`}
          >
            <Save className="h-4.5 w-4.5" />
            <span>{isSaved ? '저장 완료!' : '설정 저장'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
