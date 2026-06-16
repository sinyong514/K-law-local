import React, { useState, useEffect } from 'react';
import { FileDiff, ArrowRight, Sparkles, CheckCircle2, AlertCircle, RefreshCw, Trash2, Info } from 'lucide-react';

export default function DiffViewer({ diffCandidates, onRemoveCandidate, onSelectContext }) {
  const [lawAId, setLawAId] = useState('');
  const [lawBId, setLawBId] = useState('');
  const [diffResult, setDiffResult] = useState(null);
  const [summaryStats, setSummaryStats] = useState({ added: 0, deleted: 0, modified: 0, unchanged: 0 });

  // 후보 목록이 업데이트될 때 기본 선택 설정
  useEffect(() => {
    if (diffCandidates.length >= 2) {
      if (!lawAId) setLawAId(diffCandidates[0].mst);
      if (!lawBId) setLawBId(diffCandidates[1].mst);
    }
  }, [diffCandidates, lawAId, lawBId]);

  const lawA = diffCandidates.find(c => c.mst === lawAId);
  const lawB = diffCandidates.find(c => c.mst === lawBId);

  // 조문 번호(예: "제1조") 추출 함수
  const extractArticleNumber = (content) => {
    const match = content.match(/제\s*\d+\s*조(\s*의\s*\d+)?/);
    return match ? match[0].replace(/\s/g, '') : null;
  };

  const handleCompare = () => {
    if (!lawA || !lawB) return;

    // 조문 맵 생성
    const mapA = {};
    const mapB = {};

    lawA.articles.forEach(art => {
      const num = extractArticleNumber(art.artContent);
      const key = num || art.artContent.substring(0, 15);
      mapA[key] = art;
    });

    lawB.articles.forEach(art => {
      const num = extractArticleNumber(art.artContent);
      const key = num || art.artContent.substring(0, 15);
      mapB[key] = art;
    });

    // 모든 키 모음 및 정렬
    const allKeys = Array.from(new Set([...Object.keys(mapA), ...Object.keys(mapB)])).sort((a, b) => {
      // 제1조, 제2조 등 조문 숫자로 정렬 유도
      const aNum = parseInt(a.match(/\d+/)?.[0] || '0', 10);
      const bNum = parseInt(b.match(/\d+/)?.[0] || '0', 10);
      return aNum - bNum;
    });

    let added = 0;
    let deleted = 0;
    let modified = 0;
    let unchanged = 0;

    const list = allKeys.map(key => {
      const itemA = mapA[key];
      const itemB = mapB[key];

      let status = 'unchanged';
      if (itemA && !itemB) {
        status = 'deleted';
        deleted++;
      } else if (!itemA && itemB) {
        status = 'added';
        added++;
      } else {
        // 내용 비교 (텍스트 공백 제거 후 비교)
        const textA = (itemA.artContent + ' ' + itemA.paragraphs.map(p => p.pContent).join(' ')).trim().replace(/\s+/g, '');
        const textB = (itemB.artContent + ' ' + itemB.paragraphs.map(p => p.pContent).join(' ')).trim().replace(/\s+/g, '');
        
        if (textA !== textB) {
          status = 'modified';
          modified++;
        } else {
          unchanged++;
        }
      }

      return {
        key,
        status,
        itemA,
        itemB
      };
    });

    setDiffResult(list);
    setSummaryStats({ added, deleted, modified, unchanged });
  };

  const handleAnalyzeDiffWithAI = () => {
    if (!diffResult || !lawA || !lawB) return;

    // AI 전달용 개정 내역 리포트 작성
    let report = `## [법령 개정 비교 분석 리포트]\n`;
    report += `- **비교 대상 A (개정 전)**: ${lawA.lawName} (시행일: ${lawA.effDate})\n`;
    report += `- **비교 대상 B (개정 후)**: ${lawB.lawName} (시행일: ${lawB.effDate})\n\n`;
    report += `### 📊 변경 통계\n`;
    report += `- 신설(Added): ${summaryStats.added}건\n`;
    report += `- 개정(Modified): ${summaryStats.modified}건\n`;
    report += `- 삭제(Deleted): ${summaryStats.deleted}건\n\n`;
    report += `### 🔍 주요 변경 조문 세부 내역\n`;

    diffResult.forEach(diff => {
      if (diff.status === 'added') {
        report += `#### [신설] ${diff.key}\n- 내용: ${diff.itemB.artContent}\n\n`;
      } else if (diff.status === 'deleted') {
        report += `#### [삭제] ${diff.key}\n- 내용: ${diff.itemA.artContent}\n\n`;
      } else if (diff.status === 'modified') {
        report += `#### [개정] ${diff.key}\n`;
        report += `- **개정 전**: ${diff.itemA.artContent}\n`;
        report += `- **개정 후**: ${diff.itemB.artContent}\n\n`;
      }
    });

    const aiPrompt = `위 개정 통계 및 조문 세부 내역을 검토하고, 개정 전후의 법리적 변화가 피규제자 또는 실무에 미치는 영향 및 주요 쟁점을 상세히 분석해 주세요.`;

    onSelectContext({
      title: `${lawA.lawName} ↔ ${lawB.lawName} 시점 비교`,
      text: report + `\n\n[AI 분석 요청 사항]\n${aiPrompt}`
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6 bg-[#0b0f19]">
      {/* 상단 컨트롤 바 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <FileDiff className="h-6 w-6 text-brand-400" />
            <span>제정/개정 시점 비교 (Diff)</span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            등록된 서로 다른 시점의 법령 본문을 선택하고 조문 단위로 차이점(신설, 개정, 삭제)을 비교합니다.
          </p>
        </div>
      </div>

      {/* 비교 후보 리스트 관리 */}
      {diffCandidates.length < 2 ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-2xl p-8 bg-slate-900/10">
          <FileDiff className="h-12 w-12 text-slate-600 mb-3" />
          <h4 className="text-sm font-bold text-slate-300">비교 대상 부족</h4>
          <p className="text-xs text-slate-500 max-w-sm text-center mt-1.5 leading-relaxed">
            시점 비교를 하려면 최소 2개 이상의 법령 버전이 필요합니다. 먼저 <strong className="text-brand-400">'법령 검색'</strong> 메뉴에서 법령을 검색한 후, 조문 우측 상단의 <strong className="text-brand-400">'시점 비교에 추가'</strong> 버튼을 클릭하여 버전을 등록해 주세요.
          </p>
          {diffCandidates.length === 1 && (
            <div className="mt-6 w-full max-w-md bg-slate-900/40 p-4 rounded-xl border border-slate-800">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">현재 등록된 후보 (1개)</p>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-medium truncate">{diffCandidates[0].lawName}</span>
                <button
                  onClick={() => onRemoveCandidate(diffCandidates[0].mst)}
                  className="text-rose-400 hover:text-rose-300 transition-premium"
                >
                  삭제
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden space-y-4">
          {/* 셀렉터 영역 */}
          <div className="glass-panel p-4 rounded-2xl flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-3 flex-1">
              <div className="flex flex-col space-y-1 flex-1">
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider pl-1">대상 A (개정 전)</span>
                <select
                  value={lawAId}
                  onChange={(e) => setLawAId(e.target.value)}
                  className="bg-[#0b0f19] border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold focus:outline-none focus:border-brand-500 transition-premium cursor-pointer w-full"
                >
                  {diffCandidates.map(c => (
                    <option key={c.mst} value={c.mst}>{c.lawName} (시행일: {c.effDate})</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 text-slate-500">
                <ArrowRight className="h-5 w-5" />
              </div>

              <div className="flex flex-col space-y-1 flex-1">
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider pl-1">대상 B (개정 후)</span>
                <select
                  value={lawBId}
                  onChange={(e) => setLawBId(e.target.value)}
                  className="bg-[#0b0f19] border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold focus:outline-none focus:border-brand-500 transition-premium cursor-pointer w-full"
                >
                  {diffCandidates.map(c => (
                    <option key={c.mst} value={c.mst}>{c.lawName} (시행일: {c.effDate})</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleCompare}
              disabled={lawAId === lawBId}
              className="flex items-center space-x-1.5 px-5 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl text-xs font-bold transition-premium shadow-lg shadow-brand-500/10 btn-glow h-fit mt-4"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>시점 비교 실행</span>
            </button>
          </div>

          {/* 결과 및 분석 패널 */}
          {diffResult ? (
            <div className="flex-1 flex flex-col overflow-hidden space-y-4">
              {/* 요약 통계 대시보드 */}
              <div className="flex justify-between items-center bg-[#0d1321]/50 border border-slate-800/80 p-4 rounded-xl">
                <div className="flex items-center space-x-6">
                  <span className="text-xs text-slate-400">비교 결과 요약:</span>
                  <div className="flex items-center space-x-4">
                    <span className="text-xs text-emerald-400 font-medium flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>신설 {summaryStats.added}건</span>
                    </span>
                    <span className="text-xs text-amber-400 font-medium flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span>개정 {summaryStats.modified}건</span>
                    </span>
                    <span className="text-xs text-rose-400 font-medium flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      <span>삭제 {summaryStats.deleted}건</span>
                    </span>
                    <span className="text-xs text-slate-500 font-medium flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                      <span>동일 {summaryStats.unchanged}건</span>
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleAnalyzeDiffWithAI}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-brand-500/15 hover:bg-brand-500/25 border border-brand-500/30 text-brand-300 rounded-lg text-xs font-semibold transition-premium"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>개정 영향 AI 분석</span>
                </button>
              </div>

              {/* Side-by-Side 조문 카드 리스트 */}
              <div className="flex-1 overflow-y-auto space-y-3 p-1">
                {diffResult.map((diff, index) => {
                  if (diff.status === 'unchanged') return null; // 동일 조문은 생략하여 변경사항 집중화
                  
                  const isAdded = diff.status === 'added';
                  const isDeleted = diff.status === 'deleted';
                  const isModified = diff.status === 'modified';

                  return (
                    <div
                      key={index}
                      className={`border rounded-xl p-4 transition-premium space-y-3 ${
                        isAdded ? 'bg-emerald-500/5 border-emerald-500/20' :
                        isDeleted ? 'bg-rose-500/5 border-rose-500/20' :
                        'bg-amber-500/5 border-amber-500/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">{diff.key}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                          isAdded ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          isDeleted ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {isAdded ? '신설' : isDeleted ? '삭제' : '개정'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* A (개정 전) */}
                        <div className="space-y-1.5">
                          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">A (이전)</p>
                          <div className={`p-3 rounded-lg text-xs text-slate-400 leading-relaxed font-sans ${isDeleted ? 'bg-rose-500/5 border border-rose-500/10 text-rose-300/80 line-through' : 'bg-slate-900/40 border border-slate-800'}`}>
                            {diff.itemA ? (
                              <div>
                                <p className="font-semibold text-slate-300">{diff.itemA.artContent}</p>
                                {diff.itemA.paragraphs.map((p, pIdx) => (
                                  <p key={pIdx} className="pl-3 mt-1 text-[11px] text-slate-500">{p.pContent}</p>
                                ))}
                              </div>
                            ) : (
                              <p className="text-slate-600 italic">조문 없음 (신설 조항)</p>
                            )}
                          </div>
                        </div>

                        {/* B (개정 후) */}
                        <div className="space-y-1.5">
                          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">B (이후)</p>
                          <div className={`p-3 rounded-lg text-xs text-slate-400 leading-relaxed font-sans ${isAdded ? 'bg-emerald-500/5 border border-emerald-500/10 text-emerald-300/80 font-medium' : 'bg-slate-900/40 border border-slate-800'}`}>
                            {diff.itemB ? (
                              <div>
                                <p className="font-semibold text-slate-200">{diff.itemB.artContent}</p>
                                {diff.itemB.paragraphs.map((p, pIdx) => (
                                  <p key={pIdx} className="pl-3 mt-1 text-[11px] text-slate-400">{p.pContent}</p>
                                ))}
                              </div>
                            ) : (
                              <p className="text-slate-600 italic">조문 삭제됨</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#090d16]/30 border border-slate-800/80 rounded-2xl">
              <Info className="h-8 w-8 text-slate-600 mb-2" />
              <h4 className="text-xs font-semibold text-slate-400">비교 대기 중</h4>
              <p className="text-[11px] text-slate-500 max-w-xs mt-1">상단에서 비교할 두 대상을 선택한 뒤 "시점 비교 실행" 버튼을 누르시면 개정 조문 차이점이 렌더링됩니다.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
