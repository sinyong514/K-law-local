import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import LawSearch from './components/LawSearch';
import Citator from './components/Citator';
import DiffViewer from './components/DiffViewer';
import SettingsModal from './components/SettingsModal';
import ChatSection from './components/ChatSection';

export default function App() {
  const [activeTab, setActiveTab] = useState('lawSearch');
  
  // LocalStorage로부터 API 키 초기화
  const [apiKeys, setApiKeys] = useState({
    law: '',
    openai: '',
    anthropic: '',
    gemini: ''
  });

  // 시점 비교 후보 목록
  const [diffCandidates, setDiffCandidates] = useState([]);

  // AI 분석용 법률 컨텍스트
  const [selectedContext, setSelectedContext] = useState(null);

  useEffect(() => {
    const savedLaw = localStorage.getItem('KLAW_LAW_API_KEY') || '';
    const savedOpenAI = localStorage.getItem('KLAW_OPENAI_API_KEY') || '';
    const savedAnthropic = localStorage.getItem('KLAW_ANTHROPIC_API_KEY') || '';
    const savedGemini = localStorage.getItem('KLAW_GEMINI_API_KEY') || '';

    setApiKeys({
      law: savedLaw,
      openai: savedOpenAI,
      anthropic: savedAnthropic,
      gemini: savedGemini
    });
  }, []);

  // 시점 비교 법령 추가
  const handleAddToDiff = (lawBody) => {
    // 중복 추가 방지
    if (diffCandidates.some(c => c.mst === lawBody.mst)) {
      alert("이미 시점 비교 후보에 등록된 법령입니다.");
      return;
    }
    setDiffCandidates(prev => [...prev, lawBody]);
    alert(`[${lawBody.lawName}]이(가) 시점 비교 후보에 등록되었습니다. '제·개정 시점 비교' 탭에서 확인하세요.`);
  };

  // 시점 비교 법령 제거
  const handleRemoveCandidate = (mst) => {
    setDiffCandidates(prev => prev.filter(c => c.mst !== mst));
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0b0f19] text-slate-100">
      
      {/* 1. 왼쪽 사이드바 네비게이션 */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 2. 중앙 메인 작업 영역 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'lawSearch' && (
          <LawSearch 
            apiKey={apiKeys.law} 
            onSelectContext={setSelectedContext} 
            onAddToDiff={handleAddToDiff} 
          />
        )}
        {activeTab === 'citator' && (
          <Citator 
            apiKey={apiKeys.law} 
            onSelectContext={setSelectedContext} 
          />
        )}
        {activeTab === 'diffViewer' && (
          <DiffViewer 
            diffCandidates={diffCandidates} 
            onRemoveCandidate={handleRemoveCandidate}
            onSelectContext={setSelectedContext} 
          />
        )}
        {activeTab === 'settings' && (
          <SettingsModal 
            onSettingsChange={setApiKeys} 
          />
        )}
      </main>

      {/* 3. 오른쪽 AI 법률 대화 분석창 */}
      <ChatSection 
        selectedContext={selectedContext} 
        apiKeys={apiKeys} 
      />

    </div>
  );
}
