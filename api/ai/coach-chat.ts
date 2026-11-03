import { GoogleGenAI } from '@google/genai';

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

function generateFallbackCoachReply(
  userMessage: string = '',
  profile: any = {},
  level: number = 1
) {
  const company = profile.targetCompany || '목표 기업';
  const role = profile.targetRole || '목표 직무';

  return `안녕하세요, ${profile?.name || '취준생'}님! 현재 Lv.${level}에서 ${company} ${role} 합격을 향해 꾸준히 달려가고 계시네요.

질문해주신 "${userMessage || '취업 준비 전략'}"에 대해 실무적 관점에서 안내드립니다.

1. **우선순위의 명확화**: 채용 담당자가 가장 먼저 보는 것은 "이 지원자가 우리 팀에 입사해서 내일부터 당장 무엇을 할 수 있는가"입니다. 추상적인 자격증 나열보다 직무 도구를 사용해 만들어본 '결과물'이 서류와 면접에서 10배 강한 인상을 줍니다.
2. **오늘의 추천 액션**:
   - 현재 등록된 미션 중 난이도 EASY나 NORMAL 미션 하나를 골라 1시간 안에 산출물을 만들어 '결과물 등록'을 완료해보세요.
   - 경험치(XP)를 쌓으면서 자연스럽게 포트폴리오 탭에 여러분의 실적이 차곡차곡 쌓이게 됩니다.

어떤 분야부터 먼저 시작하고 싶으신가요? 직무 실습 미션, 자격증 기출 풀이, 혹은 ${company} 기업 분석 중 관심 있는 영역을 알려주시면 바로 퀘스트로 쪼개드릴게요!`;
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
    const { messages = [], userMessage = '', profile = {}, activeMissions = [], level = 1, xp = 0 } = body;

    const ai = getGeminiClient();
    if (!ai) {
      console.warn('GEMINI_API_KEY is not configured. Using fallback coach reply.');
      return res.status(200).json({
        success: true,
        reply: generateFallbackCoachReply(userMessage, profile, level),
        isFallback: true,
        warning: '환경변수에 GEMINI_API_KEY가 설정되지 않아 기본 조언이 제공되었습니다.',
      });
    }

    const company = profile?.targetCompany || '목표 기업';
    const role = profile?.targetRole || '목표 직무';
    const major = profile?.major || '전공';

    const systemInstruction = `
당신은 'Career Mission'의 전담 AI 취업 코치입니다.
사용자 정보:
- 이름: ${profile?.name || '취준생'}
- 목표: ${company} ${role}
- 전공: ${profile?.university || ''} ${major} (${profile?.grade || ''})
- 현재 레벨: Lv.${level} (${xp} XP)
- 활성 미션 수: ${(activeMissions || []).length}개

코칭 원칙:
1. 추상적인 응원 대신 "오늘 당장 1시간 동안 무엇을 해야 하는지" 구체적인 액션을 제시하세요.
2. 미션 추천, 포트폴리오 기획, 전공/자격증 공략법, 기업 분석 가이드를 직접적이고 친절하면서도 전문적인 어조로 설명하세요.
3. 실제 채용 공고와 일반적인 직무 요구사항을 명확히 구분하세요.
4. 답변 말미에 사용자가 앱에서 수행할 수 있는 "오늘의 추천 액션" 1가지를 명확히 짚어주세요.
`;

    // Format chat context
    let conversationHistory = '';
    if (Array.isArray(messages) && messages.length > 0) {
      const recent = messages.slice(-6);
      conversationHistory = recent
        .map((m: any) => `${m.sender === 'user' ? '사용자' : 'AI 코치'}: ${m.text}`)
        .join('\n');
    }

    const prompt = `
[이전 대화 기록]
${conversationHistory || '(첫 대화)'}

[사용자의 새 질문]
${userMessage}
`;

    const reply = await generateContentWithFallback(prompt, {
      systemInstruction,
    });

    return res.status(200).json({
      success: true,
      reply: reply || generateFallbackCoachReply(userMessage, profile, level),
      isFallback: false,
    });
  } catch (err: any) {
    console.error('Error in /api/ai/coach-chat:', {
      status: err?.status || err?.code,
      message: err?.message?.slice(0, 100),
    });

    return res.status(200).json({
      success: true,
      reply: generateFallbackCoachReply(req.body?.userMessage, req.body?.profile, req.body?.level),
      isFallback: true,
      errorNotice: 'AI 서비스 일시적 지연으로 인해 기본 조언이 제공되었습니다.',
    });
  }
}
