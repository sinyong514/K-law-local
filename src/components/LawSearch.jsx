import React, { useState } from 'react';
import { Search, Loader2, FileText, ChevronRight, Sparkles, Plus, AlertCircle } from 'lucide-react';
import { searchLaw, getLawBody } from '../lib/lawApi';

export default function LawSearch({ apiKey, onSelectContext, onAddToDiff }) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedLaw, setSelectedLaw] = useState(null);
  const [lawBody, setLawBody] = useState(null);
  const [isLoadingBody, setIsLoadingBody] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsLoading(true);
    setError('');
    setSelectedLaw(null);
    setLawBody(null);
    
    try {
      const { list } = await searchLaw(query, apiKey);
      setResults(list);
      if (list.length === 0) {
        setError(`"${query}"에 대한 법령 검색 결과가 없습니다. 정확한 법령명이나 약칭을 입력해 주세요.`);
      }
    } catch (err) {
      console.error(err);
      setError('법령 검색 중 오류가 발생했습니다. 설정 탭에서 법제처 API 인증키가 올바른지 확인해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectLaw = async (law) => {
    setSelectedLaw(law);
    setIsLoadingBody(true);
    setLawBody(null);
    setError('');

    try {
      const body = await getLawBody(law.mst, apiKey);
      setLawBody(body);
    } catch (err) {
      console.error(err);
      setError('법령 본문을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsLoadingBody(false);
    }
  };

  const handleAnalyze = () => {
    if (!lawBody) return;
    onSelectContext({
      title: lawBody.lawName,
      text: lawBody.formattedText
    });
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0b0f19]">
      {/* 왼쪽: 검색 및 리스트 */}
      <div className="w-80 border-r border-slate-800/80 flex flex-col h-full bg-[#0d1321]/30">
        <div className="p-4 border-b border-slate-800/80">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="법령명 또는 약칭 (예: 화관법)"
              className="w-full bg-[#0d1321] border border-slate-700/60 rounded-xl pl-4 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-premium"
            />
            <button
              type="submit"
              className="absolute right-2 top-2 p-1 text-slate-400 hover:text-white transition-premium"
            >
              <Search className="h-4.5 w-4.5" />
            </button>
          </form>
        </div>

        {/* 결과 리스트 */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="h-6 w-6 text-brand-400 animate-spin" />
              <span className="text-xs text-slate-500">법령 검색 중...</span>
            </div>
          ) : results.length > 0 ? (
            results.map((r, idx) => {
              const isSelected = selectedLaw?.mst === r.mst;
              const isHistory = r.statusCode === '연혁';
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectLaw(r)}
                  className={`w-full text-left p-3 rounded-xl transition-premium flex items-start space-x-2.5 border ${
                    isSelected
                      ? 'bg-brand-500/10 border-brand-500/30 text-white'
                      : 'border-transparent text-slate-400 hover:bg-slate-800/30 hover:text-slate-200'
                  }`}
                >
                  <FileText className={`h-4.5 w-4.5 mt-0.5 flex-shrink-0 ${isSelected ? 'text-brand-400' : 'text-slate-500'}`} />
                  <div className="overflow-hidden flex-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-semibold truncate text-slate-200">{r.name}</span>
                      {isHistory ? (
                        <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1 py-0.2 rounded border border-amber-500/20 font-bold flex-shrink-0">연혁</span>
                      ) : (
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1 py-0.2 rounded border border-emerald-500/20 font-bold flex-shrink-0">현행</span>
                      )}
                    </div>
                    {r.abbr && <p className="text-[10px] text-slate-500 truncate mt-0.5">약칭: {r.abbr}</p>}
                    <p className="text-[9px] text-slate-500 mt-1">시행일: {r.effDate || '미정'}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-600 mt-1 flex-shrink-0" />
                </button>
              );
            })
          ) : (
            <div className="p-4 text-center text-xs text-slate-600">
              {!apiKey ? (
                <div className="flex flex-col items-center space-y-2.5 bg-amber-500/5 p-4 rounded-xl border border-amber-500/20 text-amber-400/90 leading-normal">
                  <AlertCircle className="h-5 w-5 text-amber-400" />
                  <span className="font-bold text-[11px]">법제처 API 인증키 누락</span>
                  <span className="text-[10px] text-slate-500">왼쪽 아래 설정(톱니바퀴) 메뉴로 이동하셔서 [법제처 API 키]를 먼저 입력하고 저장해 주세요.</span>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center space-y-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  <span>{error}</span>
                </div>
              ) : (
                "검색어를 입력하고 엔터를 누르세요."
              )}
            </div>
          )}
        </div>
      </div>

      {/* 오른쪽: 상세 정보 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {isLoadingBody ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-8 w-8 text-brand-400 animate-spin" />
            <span className="text-xs text-slate-500">법령 상세 조문을 가져오는 중입니다...</span>
          </div>
        ) : lawBody ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 조문 헤더 액션 바 */}
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-[#0d1321]/30">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>{lawBody.lawName}</span>
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">시행일자: {lawBody.effDate} | 공포번호: {lawBody.lawId}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onAddToDiff(lawBody)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-premium border border-slate-700/60"
                  title="시점 비교 후보에 추가"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>시점 비교에 추가</span>
                </button>
                <button
                  onClick={handleAnalyze}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold transition-premium shadow-lg shadow-brand-500/10 btn-glow"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>AI로 분석</span>
                </button>
              </div>
            </div>

            {/* 조문 텍스트 뷰어 */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#090d16] font-sans selection:bg-brand-500/30 select-text">
              <div className="max-w-3xl mx-auto text-slate-300 leading-relaxed text-sm space-y-6">
                <h1 className="text-xl font-bold text-white border-b border-slate-800 pb-4">{lawBody.lawName}</h1>
                
                {lawBody.articles.map((art, idx) => (
                  <div key={idx} className="bg-slate-900/20 p-4 rounded-xl border border-slate-800/40 space-y-2.5">
                    <h4 className="font-bold text-slate-100 flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 bg-brand-500 rounded-full"></span>
                      <span>{art.artContent}</span>
                    </h4>
                    {art.paragraphs.map((p, pIdx) => (
                      <div key={pIdx} className="pl-4 text-xs text-slate-400 space-y-1.5">
                        <p>{p.pContent}</p>
                        {p.items.map((item, iIdx) => (
                          <p key={iIdx} className="pl-4 text-[11px] text-slate-500">{item.iContent}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800/80 max-w-sm space-y-3">
              <FileText className="h-10 w-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-300">조문 뷰어</h4>
              <p className="text-xs text-slate-500">왼쪽 검색 결과에서 법령을 선택하면 여기에 상세 조문 목록이 로드됩니다.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
