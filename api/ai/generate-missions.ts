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

function generateFallbackMissions(profile: any = {}, count: number = 3, focusCategory?: string) {
  const company = profile.targetCompany || '목표 기업';
  const role = profile.targetRole || '희망 직무';
  const skills = profile.skills || 'CAD/개발 툴';

  const pool = [
    {
      title: `${company} 최신 지속가능경영보고서 및 차세대 핵심 기술 과제 3선 분석`,
      description: `DART 전자공시 및 ${company} 공식 IR 자료실에서 차세대 핵심 사업 방향과 기술적 과제를 요약합니다.`,
      category: '기업 분석',
      difficulty: 'NORMAL',
      xp: 200,
      estimatedHours: 3,
      steps: [
        `${company} 공식 홈페이지 및 DART 공시에서 최신 사업보고서 열람`,
        '지원 직무와 밀접한 차세대 기술 키워드 3가지 발췌',
        '지원 동기 및 직무 포부와 연결한 1페이지 분석 노트 작성',
      ],
      completionCondition: `${company} 핵심 기술 분석 요약 노트를 포트폴리오 결과물로 첨부하세요.`,
      recommendedResources: ['DART 전자공시시스템', `${company} 공식 보도자료`, '한국IR협의회 리포트'],
      linkedSkill: '산업/기업 분석',
    },
    {
      title: `${skills} 직무 핵심 도구 실무 튜토리얼 구현 및 결과물 등록`,
      description: `${role} 수행에 필요한 핵심 도구의 실무 예제를 직접 제작하고 캡처본 또는 작업 파일을 저장합니다.`,
      category: '기술 습득',
      difficulty: 'NORMAL',
      xp: 200,
      estimatedHours: 4,
      steps: [
        '직무 관련 튜토리얼 1챕터 완독 및 기능 학습',
        '기본 예제 직접 모델링 또는 코딩으로 구현',
        '결과물 캡처 이미지 및 소스파일 저장 및 자가 검증',
      ],
      completionCondition: '직접 제작한 3D 모델 파일, 소스코드 또는 결과물 스크린샷 등록',
      recommendedResources: ['유튜브 실무 튜토리얼', '공식 도큐먼트', '기출 예제집'],
      linkedSkill: '직무 도구 활용',
    },
    {
      title: `OPIc/토익스피킹 ${role} 프로젝트 설명 롤플레이 스크립트 작성 및 음성 녹음`,
      description: '어학 말하기 시험의 필수 문항인 자기소개와 관심 프로젝트 답변을 작성하고 3회 녹음합니다.',
      category: '어학',
      difficulty: 'EASY',
      xp: 100,
      estimatedHours: 2,
      steps: [
        '빈출 문항 3가지(자기소개, 최근 프로젝트, 직무 관심사) 영문 스크립트 작성',
        '어색한 발음 및 문법 교정',
        '스마트폰 음성 메모로 실전 녹음 후 자가 피드백',
      ],
      completionCondition: '작성한 스크립트 텍스트 및 녹음 요약 일지 첨부',
      recommendedResources: ['OPIc 기출 빈출 유형 모음집', 'Papago 발음 확인'],
      linkedSkill: '글로벌 커뮤니케이션',
    },
    {
      title: '과거 전공 캡스톤/수업 프로젝트를 STAR 기법 경험기술서로 재구조화',
      description: '과거에 수행한 프로젝트를 Situation, Task, Action, Result 구조로 정리하여 자소서와 포트폴리오에 쓸 수 있게 만듭니다.',
      category: '포트폴리오',
      difficulty: 'HARD',
      xp: 350,
      estimatedHours: 6,
      steps: [
        '프로젝트 배경 및 본인이 맡은 문제(Problem) 명확화',
        '문제 해결을 위해 적용한 구체적 기술 방법(Action) 상세 기록',
        '정량적 성과(Result) 및 배운 점(Insight) 도출',
        'Career Mission 포트폴리오 탭에 정식 등록',
      ],
      completionCondition: 'Career Mission 포트폴리오 탭에 1건의 정식 프로젝트로 등록 완료',
      recommendedResources: ['STAR 기법 작성 가이드', '합격자 포트폴리오 레퍼런스'],
      linkedSkill: '프로젝트 아카이빙',
    },
    {
      title: `${role} 직무 면접 빈출 전공 핵심 개념 10선 요약 노트 제작`,
      description: '서류 통과 후 진행되는 1차 기술/전공 면접에서 반드시 나오는 전공 이론 핵심 질문을 정리합니다.',
      category: '전공 공부',
      difficulty: 'NORMAL',
      xp: 200,
      estimatedHours: 3,
      steps: [
        '전공 필수 교재 및 족보에서 빈출 구술 면접 질문 10개 선별',
        '1분 내로 답변할 수 있는 두괄식 핵심 답변 작성',
        '수식 유도 및 도해를 포함한 A4 2장 분량 서머리 작성',
      ],
      completionCondition: '직접 정리한 전공 면접 개념 서머리 노트 파일 등록',
      recommendedResources: ['전공 핵심 기본서', '기출 면접 질문 모음집'],
      linkedSkill: '전공 기초',
    },
  ];

  if (focusCategory) {
    const filtered = pool.filter((m) => m.category === focusCategory);
    if (filtered.length > 0) {
      return filtered.slice(0, count);
    }
  }

  return pool.slice(0, count);
}

export default async function handler(req: any, res: any) {
  // CORS and Headers
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
    const { profile = {}, count = 3, focusCategory } = body;

    const ai = getGeminiClient();
    if (!ai) {
      console.warn('GEMINI_API_KEY is not configured. Using tailored fallback generator.');
      return res.status(200).json({
        success: true,
        data: generateFallbackMissions(profile, count, focusCategory),
        isFallback: true,
        warning: '환경변수에 GEMINI_API_KEY가 설정되지 않아 사전 구성된 맞춤 미션이 제공되었습니다.',
      });
    }

    const company = profile.targetCompany || '목표 기업';
    const role = profile.targetRole || '목표 직무';
    const skills = profile.skills || '기초 전공지식';
    const hours = profile.dailyStudyHours || 3;

    const prompt = `
당신은 게이미피케이션 기반 취업 미션 시스템의 AI 퀘스트 마스터입니다.
지원자 목표 기업(${company}), 직무(${role}), 현재 스펙(${skills}), 하루 가용시간(${hours}시간)을 바탕으로 실행 가능한 취업 준비 미션을 정확히 ${count}개 생성하세요.

[핵심 원칙]
- 단순히 "책 읽기" 같은 모호한 미션은 금지합니다.
- 반드시 '실제로 제작한 결과물, 보고서, 3D 모델링, 코드, 깃허브 링크, 자격증 접수증/기출풀이 메모 등' 구체적인 증빙/완료 조건을 명시하세요.
- difficulty 값은 반드시 'EASY', 'NORMAL', 'HARD', 'EPIC' 중 하나여야 합니다.
- xp 값은 난이도에 따라 EASY: 100, NORMAL: 200, HARD: 350, EPIC: 500 중 하나로 부여하세요.
- category 값은 '전공 공부', '기술 습득', '자격증', '어학', '프로젝트', '기업 분석', '취업 준비', '포트폴리오' 중 하나여야 합니다.
${focusCategory ? `- 이번 요청 집중 카테고리: ${focusCategory}` : ''}
`;

    const rawJsonText = await generateContentWithFallback(prompt, {
      systemInstruction: '취업 준비생에게 매일 실질적인 산출물을 만들게 돕는 게임 퀘스트 생성기입니다. 한국어로 작성하세요.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            xp: { type: Type.INTEGER },
            estimatedHours: { type: Type.INTEGER },
            steps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            completionCondition: { type: Type.STRING },
            recommendedResources: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            linkedSkill: { type: Type.STRING },
          },
          required: [
            'title',
            'description',
            'category',
            'difficulty',
            'xp',
            'estimatedHours',
            'steps',
            'completionCondition',
            'recommendedResources',
          ],
        },
      },
    });

    const parsed = parseCleanJson(rawJsonText);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return res.status(200).json({
        success: true,
        data: parsed,
        isFallback: false,
      });
    }

    return res.status(200).json({
      success: true,
      data: generateFallbackMissions(profile, count, focusCategory),
      isFallback: true,
    });
  } catch (err: any) {
    console.error('Error in /api/ai/generate-missions:', {
      status: err?.status || err?.code,
      message: err?.message?.slice(0, 100),
    });

    const fallbackData = generateFallbackMissions(
      req.body?.profile,
      req.body?.count || 3,
      req.body?.focusCategory
    );

    return res.status(200).json({
      success: true,
      data: fallbackData,
      isFallback: true,
      errorNotice: 'AI 서비스 일시적 지연으로 인해 직무 맞춤 퀘스트가 대체 생성되었습니다.',
    });
  }
}
