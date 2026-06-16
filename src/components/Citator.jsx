import React, { useState } from 'react';
import { Search, Loader2, Scale, ChevronRight, Sparkles, AlertTriangle, ShieldCheck, Info } from 'lucide-react';
import { searchPrecedents, getPrecedentBody } from '../lib/lawApi';

export default function Citator({ apiKey, onSelectContext }) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedPrec, setSelectedPrec] = useState(null);
  const [precBody, setPrecBody] = useState(null);
  const [isLoadingBody, setIsLoadingBody] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError('');
    setSelectedPrec(null);
    setPrecBody(null);

    try {
      const { list } = await searchPrecedents(query, apiKey);
      setResults(list);
      if (list.length === 0) {
        setError(`"${query}"에 대한 판례 검색 결과가 없습니다. 사건번호나 주요 키워드로 다시 검색해 보세요.`);
      }
    } catch (err) {
      console.error(err);
      setError('판례 검색 중 오류가 발생했습니다. 설정 탭에서 법제처 API 인증키가 올바른지 확인해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPrec = async (prec) => {
    setSelectedPrec(prec);
    setIsLoadingBody(true);
    setPrecBody(null);
    setError('');

    try {
      const body = await getPrecedentBody(prec.id, apiKey);
      setPrecBody(body);
    } catch (err) {
      console.error(err);
      setError('판례 상세조회 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsLoadingBody(false);
    }
  };

  // AI 유효성 검증 트리거
  const handleValidateWithAI = () => {
    if (!precBody) return;
    
    // AI에 전달할 맞춤형 프롬프트 구성
    const title = `[판례] ${precBody.title} (${precBody.caseNumber})`;
    const validationPrompt = `위 판례(${precBody.caseNumber})의 법리적 생사(유효성)를 판례 내용 및 관련 판례 흐름을 토대로 분석해 주세요. 
해당 판례가 대법원 전원합의체 판결 등에 의해 폐기(Overruled)되었거나 변경된 이력이 있는지, 혹은 현재도 유효하게 적용되는 판례인지 여부를 판시사항과 판결요지를 참조하여 철저히 확인해 주기 바랍니다.`;

    onSelectContext({
      title,
      text: precBody.formattedText + `\n\n[AI 분석 요청 사항]\n${validationPrompt}`
    });
  };

  // 판례 텍스트 내부의 폐기/변경 키워드 자체 휴리스틱 검증
  const detectPrecedentStatus = () => {
    if (!precBody) return { status: 'unknown', label: '알 수 없음', desc: '' };
    
    const textToScan = `${precBody.holdings} ${precBody.summary} ${precBody.refPrecs}`.toLowerCase();
    
    if (textToScan.includes('변경') && textToScan.includes('전원합의체')) {
      return {
        status: 'changed_caution',
        label: '변경 가능성 감지',
        desc: '해당 판례의 판시사항 혹은 참조판례에 "전원합의체 판결로 변경" 과 관련된 키워드가 존재합니다. 유효성 재확인이 필요합니다.',
        type: 'warning'
      };
    }
    
    if (textToScan.includes('폐기')) {
      return {
        status: 'overruled',
        label: '폐기 가능성 감지',
        desc: '해당 판례의 법리가 폐기되었음을 나타내는 키워드가 감지되었습니다. 실무 인용 시 대법원 전원합의체 판결을 다시 확인하십시오.',
        type: 'danger'
      };
    }

    if (precBody.decisionType && precBody.decisionType.includes('전원합의체')) {
      return {
        status: 'grand_bench',
        label: '대법원 전원합의체 판결',
        desc: '최고 법원의 전원합의체 판결로서 강력한 구속력을 가집니다. 관련 판례 법리의 시발점이 되는 판례입니다.',
        type: 'info'
      };
    }

    return {
      status: 'active',
      label: '일반 판례 법리',
      desc: '본 판례의 법리는 통상적인 대법원 또는 하급심의 법리입니다. AI 유효성 검증을 통해 구체적인 변경 이력을 교차 점검할 수 있습니다.',
      type: 'success'
    };
  };

  const statusInfo = detectPrecedentStatus();

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0b0f19]">
      {/* 왼쪽: 검색 및 판례 리스트 */}
      <div className="w-80 border-r border-slate-800/80 flex flex-col h-full bg-[#0d1321]/30">
        <div className="p-4 border-b border-slate-800/80">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="사건번호 또는 키워드 (예: 2012다94643)"
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

        {/* 판례 결과 리스트 */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="h-6 w-6 text-brand-400 animate-spin" />
              <span className="text-xs text-slate-500">판례 검색 중...</span>
            </div>
          ) : results.length > 0 ? (
            results.map((r, idx) => {
              const isSelected = selectedPrec?.id === r.id;
              const isGrand = r.decisionType && r.decisionType.includes('전원합의체');
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectPrec(r)}
                  className={`w-full text-left p-3 rounded-xl transition-premium flex items-start space-x-2.5 border ${
                    isSelected
                      ? 'bg-brand-500/10 border-brand-500/30 text-white'
                      : 'border-transparent text-slate-400 hover:bg-slate-800/30 hover:text-slate-200'
                  }`}
                >
                  <Scale className={`h-4.5 w-4.5 mt-0.5 flex-shrink-0 ${isSelected ? 'text-brand-400' : 'text-slate-500'}`} />
                  <div className="overflow-hidden flex-1">
                    <div className="flex items-center space-x-1.5 justify-between">
                      <span className="text-xs font-semibold truncate text-slate-200 block max-w-[140px]">{r.title}</span>
                      {isGrand && (
                        <span className="text-[8px] bg-brand-500/20 text-brand-300 px-1 py-0.2 rounded border border-brand-500/30 font-bold flex-shrink-0">전합</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{r.caseNumber}</p>
                    <p className="text-[9px] text-slate-500 mt-1">{r.court} | {r.date}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-600 mt-1 flex-shrink-0" />
                </button>
              );
            })
          ) : (
            <div className="p-4 text-center text-xs text-slate-600">
              {!apiKey ? (
                <div className="flex flex-col items-center space-y-2.5 bg-amber-500/5 p-4 rounded-xl border border-amber-500/20 text-amber-400/90 leading-normal">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  <span className="font-bold text-[11px]">법제처 API 인증키 누락</span>
                  <span className="text-[10px] text-slate-500">왼쪽 아래 설정(톱니바퀴) 메뉴로 이동하셔서 [법제처 API 키]를 먼저 입력하고 저장해 주세요.</span>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center space-y-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <span>{error}</span>
                </div>
              ) : (
                "사건번호나 판례 요약 키워드를 입력해 주세요."
              )}
            </div>
          )}
        </div>
      </div>

      {/* 오른쪽: 판례 상세 및 Citator 요약 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {isLoadingBody ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-8 w-8 text-brand-400 animate-spin" />
            <span className="text-xs text-slate-500">판례 전문 및 관련 정보를 호출 중입니다...</span>
          </div>
        ) : precBody ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 판례 헤더 */}
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-[#0d1321]/30">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>{precBody.title}</span>
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">사건번호: {precBody.caseNumber} | 선고일자: {precBody.date}</p>
              </div>
              <button
                onClick={handleValidateWithAI}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold transition-premium shadow-lg shadow-brand-500/10 btn-glow"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>AI로 유효성 검증</span>
              </button>
            </div>

            {/* Citator 상태 판넬 */}
            <div className="p-4 border-b border-slate-800/80 bg-[#0c111e]">
              <div className={`p-3.5 rounded-xl border flex items-start space-x-3 ${
                statusInfo.type === 'danger'
                  ? 'bg-rose-500/5 border-rose-500/20 text-rose-200'
                  : statusInfo.type === 'warning'
                  ? 'bg-amber-500/5 border-amber-500/20 text-amber-200'
                  : statusInfo.type === 'info'
                  ? 'bg-brand-500/5 border-brand-500/20 text-brand-200'
                  : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-200'
              }`}>
                {statusInfo.type === 'danger' || statusInfo.type === 'warning' ? (
                  <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${statusInfo.type === 'danger' ? 'text-rose-400' : 'text-amber-400'}`} />
                ) : (
                  <ShieldCheck className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                )}
                <div>
                  <h4 className="text-xs font-bold flex items-center space-x-1.5">
                    <span>판례 생사(Citator) 분석:</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                      statusInfo.type === 'danger' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                      statusInfo.type === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      statusInfo.type === 'info' ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>{statusInfo.label}</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{statusInfo.desc}</p>
                </div>
              </div>
            </div>

            {/* 판례 내용 뷰어 */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#090d16] font-sans selection:bg-brand-500/30 select-text">
              <div className="max-w-3xl mx-auto text-slate-300 leading-relaxed text-sm space-y-6">
                <h1 className="text-xl font-bold text-white border-b border-slate-800 pb-4">{precBody.title}</h1>
                <p className="text-xs text-slate-500">{precBody.court} / {precBody.caseNumber} / {precBody.date} 선고</p>

                {precBody.holdings && (
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-100 flex items-center space-x-1.5">
                      <Info className="h-4.5 w-4.5 text-brand-400" />
                      <span>📌 판시사항</span>
                    </h3>
                    <p className="text-xs text-slate-400 whitespace-pre-wrap pl-6">{precBody.holdings}</p>
                  </div>
                )}

                {precBody.summary && (
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-100 flex items-center space-x-1.5">
                      <Info className="h-4.5 w-4.5 text-brand-400" />
                      <span>📋 판결요지</span>
                    </h3>
                    <p className="text-xs text-slate-400 whitespace-pre-wrap pl-6">{precBody.summary}</p>
                  </div>
                )}

                {precBody.refs && (
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-100 flex items-center space-x-1.5">
                      <Info className="h-4.5 w-4.5 text-brand-400" />
                      <span>🔗 참조조문</span>
                    </h3>
                    <p className="text-xs text-slate-500 whitespace-pre-wrap pl-6">{precBody.refs}</p>
                  </div>
                )}

                {precBody.refPrecs && (
                  <div className="space-y-2">
                    <h3 className="font-bold text-slate-100 flex items-center space-x-1.5">
                      <Info className="h-4.5 w-4.5 text-brand-400" />
                      <span>📜 참조판례</span>
                    </h3>
                    <p className="text-xs text-slate-500 whitespace-pre-wrap pl-6">{precBody.refPrecs}</p>
                  </div>
                )}

                {precBody.content && (
                  <div className="space-y-2 border-t border-slate-800 pt-6">
                    <h3 className="font-bold text-slate-100 flex items-center space-x-1.5">
                      <Info className="h-4.5 w-4.5 text-brand-400" />
                      <span>📝 판례내용 전문</span>
                    </h3>
                    <p className="text-xs text-slate-400 whitespace-pre-wrap pl-6 leading-loose">{precBody.content}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800/80 max-w-sm space-y-3">
              <Scale className="h-10 w-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-300">판례 Citator</h4>
              <p className="text-xs text-slate-500">왼쪽 검색 결과에서 판례를 선택하면 사건의 상세 판결요지 및 생사 유효성 상태 분석 대시보드가 활성화됩니다.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
