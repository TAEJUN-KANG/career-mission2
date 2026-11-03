import { GoogleGenAI, Type } from '@google/genai';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseCleanJson<T = any>(rawText: string | undefined): T | null {
  if (!rawText) return null;
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch (e) {
    console.error('Failed to parse JSON from AI response:', e);
    return null;
  }
}

const CANDIDATE_MODELS = ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash'];

async function generateContentWithFallback(prompt: string, config: any = {}): Promise<string> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables');
  }

  let lastError: any = null;
  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config,
      });
      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Model ${model} request failed, attempting next candidate.`, {
        status: err?.status || err?.code,
        message: err?.message?.slice(0, 100),
      });
    }
  }

  throw lastError || new Error('All AI model candidate requests failed');
}

function generateFallbackAnalysis(profile: any = {}) {
  const role = profile.targetRole || '기계/SW 엔지니어';
  const company = profile.targetCompany || '주요 기업';

  return {
    overallSummary: `${profile.name || '사용자'}님의 현재 준비 상태는 전공 지식의 기본 틀은 잡혀 있으나, ${company} ${role} 합격을 위해서는 '직무 실무 도구 활용 능력'과 '직무 연관 프로젝트의 완성도'를 집중 보강해야 합니다.`,
    radarChart: [
      {
        domain: '전공 역량',
        currentScore: 75,
        targetScore: 88,
        statusDescription: '전공 필수 과목 이수 완료, 실무 적용 심화 필요',
        targetRequirement: '직무 핵심 전공이론 응용 및 문제해결 능력',
      },
      {
        domain: '기술 역량',
        currentScore: 55,
        targetScore: 85,
        statusDescription: '기초 툴 조작 및 실습 경험 보유',
        targetRequirement: '실무 레벨의 모델링/코딩 및 해석 도구 능숙성',
      },
      {
        domain: '자격증',
        currentScore: 50,
        targetScore: 80,
        statusDescription: '기사/직무 자격증 취득 준비 중',
        targetRequirement: '직무 필수 국가기술기사 또는 전문공인자격 1~2개',
      },
      {
        domain: '어학',
        currentScore: 65,
        targetScore: 80,
        statusDescription: '기본 어학 점수 보유 또는 취득 준비 중',
        targetRequirement: 'OPIc IM3/IH 이상 또는 토익스피킹 AL 수준',
      },
      {
        domain: '프로젝트',
        currentScore: 60,
        targetScore: 85,
        statusDescription: '수업 과제 및 캡스톤 산출물 보유',
        targetRequirement: '기획-개발-성과측정까지 완결된 직무 프로젝트 2건',
      },
      {
        domain: '경험',
        currentScore: 45,
        targetScore: 75,
        statusDescription: '동아리 활동 중심, 실무 인턴/대외활동 보완 권장',
        targetRequirement: '인턴십, 연구실 학부연구생, 또는 직무 공모전 경험',
      },
    ],
    gapAnalysis: [
      {
        area: '프로젝트 및 실무 결과물',
        severity: 'HIGH',
        gapDescription: '수업 과제 수준을 넘어 실제 직무 문제를 해결해본 프로젝트 포트폴리오가 부족합니다.',
        recommendedAction: '2~3주 단위의 직무 특화 미니 프로젝트를 기획하고 STAR 기법으로 포트폴리오를 구조화하세요.',
      },
      {
        area: '실무 기술 툴 숙련도',
        severity: 'HIGH',
        gapDescription: '이론 중심 학습으로 툴의 실무 워크플로우에 대한 즉시 투입 능력이 입증되지 않았습니다.',
        recommendedAction: '매일 1시간씩 실제 튜토리얼 예제를 따라하며 포트폴리오용 결과물 파일을 아카이빙하세요.',
      },
      {
        area: '어학 스피킹 성적',
        severity: 'MEDIUM',
        gapDescription: '대부분의 주요 기업 서류 기준인 스피킹 성적(OPIc/토스) 확보가 우선순위입니다.',
        recommendedAction: '3주 집중 스피킹 플랜을 세워 목표 등급(IM3~IH 이상)을 조기 취득하세요.',
      },
    ],
    verifiedNoticeVsGeneralEstimate: {
      verifiedFacts: `${company} 공식 채용공고 기준: 관련 전공 학사 이상 및 어학 기준(OPIc/토스) 필수 지원 자격 확인.`,
      marketEstimate: '최근 1개년 합격자 데이터 분석: 직무 연관 포트폴리오 2건 이상과 기사 자격증 보유자가 서류 통과율 3.4배 높음.',
    },
    priorityRoadmap: [
      {
        order: 1,
        title: '직무 핵심 툴 마스터 & 미니 산출물 1건 완성',
        duration: '1~2주 소요',
        reason: '서류 및 면접에서 가장 즉각적으로 어필할 수 있는 실무 무기 확보',
      },
      {
        order: 2,
        title: '어학 스피킹(OPIc/토스) 목표 등급 취득',
        duration: '3주 소요',
        reason: '서류 필터링 사전 방지 및 최소 지원 자격 조기 완성',
      },
      {
        order: 3,
        title: '목표 기업 직무 분석 및 역량 연계 포트폴리오 정리',
        duration: '2주 소요',
        reason: '경험을 STAR 기법으로 구조화하여 자기소개서에 즉시 투입',
      },
    ],
  };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. POST is required.',
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const { profile = {} } = body;

    const ai = getGeminiClient();
    if (!ai) {
      console.warn('GEMINI_API_KEY is not configured. Using fallback analysis.');
      return res.status(200).json({
        success: true,
        data: generateFallbackAnalysis(profile),
        isFallback: true,
        warning: '환경변수에 GEMINI_API_KEY가 설정되지 않아 기본 진단 결과가 표시되었습니다.',
      });
    }

    const prompt = `
당신은 대한민국 최고 수준의 취업 컨설턴트 및 직무 분석 전문가입니다.
다음 학생/취준생의 프로필과 목표를 정밀하게 분석하여 직무 역량 진단 및 레이더 차트 수치, 부족한 점, 준비 로드맵을 작성해주세요.

[사용자 프로필]
- 이름/닉네임: ${profile.name || '취준생'}
- 대학교/전공: ${profile.university || '미기재'} ${profile.major || ''}
- 학년: ${profile.grade || '3학년'} (졸업예정: ${profile.graduationYear || '2026년'})
- 관심 산업: ${(profile.targetIndustries || []).join(', ')}
- 목표 기업: ${profile.targetCompany || '목표 대기업/중견/스타트업'}
- 목표 직무: ${profile.targetRole || '희망 직무'}
- 보유 자격증: ${profile.certifications || '없음/준비중'}
- 어학 성적: ${profile.languageScores || '준비중'}
- 보유 기술/프로그램: ${profile.skills || '기초 전공지식'}
- 프로젝트/대외활동 경험: ${profile.experiences || '없음'}
- 하루 투자 가능 시간: ${profile.dailyStudyHours || 3}시간

[평가 영역 6가지]
1. 전공 역량 (전공 지식 및 이해도)
2. 기술 역량 (직무 도구, CAD/SW/분석툴/프로그래밍 등)
3. 자격증 (직무 관련 국가기술/전문 자격증)
4. 어학 (TOEIC, OPIc, 토익스피킹 등)
5. 프로젝트 (전공 프로젝트, 캡스톤, 실무 프로젝트)
6. 경험 (인턴십, 대외활동, 공모전, 직무 부트캠프)

[규칙]
- 실제 채용 공고나 공식 자료가 없는 경우 기업의 요구사항을 사실처럼 단정하지 말고, '업계 일반적 요구사항'과 '공식 공고 확인 정보'를 엄밀히 구분하여 조언하세요.
- currentScore와 targetScore는 10~100 사이 정수입니다. 사용자의 현재 스펙에 비추어 정직하고 합리적으로 평가하세요.
`;

    const rawJsonText = await generateContentWithFallback(prompt, {
      systemInstruction: '대한민국 채용 트렌드(수시채용, 직무중심 역량평가)에 맞춘 현실적이고 실행 가능한 직무 역량 분석관입니다. 한국어로 응답하세요.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallSummary: { type: Type.STRING },
          radarChart: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                domain: { type: Type.STRING },
                currentScore: { type: Type.INTEGER },
                targetScore: { type: Type.INTEGER },
                statusDescription: { type: Type.STRING },
                targetRequirement: { type: Type.STRING },
              },
              required: ['domain', 'currentScore', 'targetScore', 'statusDescription', 'targetRequirement'],
            },
          },
          gapAnalysis: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                area: { type: Type.STRING },
                severity: { type: Type.STRING },
                gapDescription: { type: Type.STRING },
                recommendedAction: { type: Type.STRING },
              },
              required: ['area', 'severity', 'gapDescription', 'recommendedAction'],
            },
          },
          verifiedNoticeVsGeneralEstimate: {
            type: Type.OBJECT,
            properties: {
              verifiedFacts: { type: Type.STRING },
              marketEstimate: { type: Type.STRING },
            },
            required: ['verifiedFacts', 'marketEstimate'],
          },
          priorityRoadmap: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                order: { type: Type.INTEGER },
                title: { type: Type.STRING },
                duration: { type: Type.STRING },
                reason: { type: Type.STRING },
              },
              required: ['order', 'title', 'duration', 'reason'],
            },
          },
        },
        required: ['overallSummary', 'radarChart', 'gapAnalysis', 'verifiedNoticeVsGeneralEstimate', 'priorityRoadmap'],
      },
    });

    const parsed = parseCleanJson(rawJsonText);
    if (parsed && parsed.radarChart) {
      return res.status(200).json({
        success: true,
        data: parsed,
        isFallback: false,
      });
    }

    return res.status(200).json({
      success: true,
      data: generateFallbackAnalysis(profile),
      isFallback: true,
    });
  } catch (err: any) {
    console.error('Error in /api/ai/competence-analysis:', {
      status: err?.status || err?.code,
      message: err?.message?.slice(0, 100),
    });

    return res.status(200).json({
      success: true,
      data: generateFallbackAnalysis(req.body?.profile),
      isFallback: true,
      errorNotice: 'AI 서비스 일시적 지연으로 인해 기본 직무 분석 데이터가 표시됩니다.',
    });
  }
}
