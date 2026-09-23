/**
 * `/shares/:token` 요청에 카드별 Open Graph 태그를 채워 넣는다.
 *
 * SPA는 정적 index.html 하나를 모든 경로에 내려주기 때문에, 링크를 카카오톡이나 슬랙에
 * 붙여넣으면 프리뷰가 서비스 공통 설명으로만 뜬다. 크롤러는 자바스크립트를 실행하지 않으므로
 * 응답 HTML 자체에 값이 들어 있어야 한다.
 *
 * User-Agent로 크롤러를 가려내지 않고, 모든 요청에 같은 index.html을 내려주되 메타 태그만
 * 바꿔 끼운다. 크롤러 판정이 빗나가 사람이 빈 페이지를 보는 경우를 아예 없애기 위해서다.
 */

interface Env {
  ASSETS: Fetcher;
  API_BASE_URL: string;
}

interface PublicShareCard {
  token: string;
  cardType: 'TODAY_VERIFICATION' | 'STREAK';
  title: string;
  userNickname: string;
  comment: string | null;
  streakDays: number;
}

/** 공유 카드 경로만 가로챈다. 토큰은 UUID라 경로 구분자와 겹치지 않는다. */
const SHARE_PATH = /^\/shares\/([^/]+)\/?$/;

/** 카드 조회가 늦어져도 페이지가 늦게 뜨지 않도록 끊는다. */
const API_TIMEOUT_MS = 2500;

const fetchCard = async (env: Env, token: string): Promise<PublicShareCard | null> => {
  try {
    const res = await fetch(`${env.API_BASE_URL}/public/shares/${encodeURIComponent(token)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicShareCard;
  } catch (err) {
    // 프리뷰는 있으면 좋은 것이지 페이지의 전제 조건이 아니다. 실패하면 원본을 그대로 내려준다.
    console.warn('공유 카드 조회 실패:', err);
    return null;
  }
};

const describe = (card: PublicShareCard): string =>
  card.cardType === 'STREAK'
    ? `${card.userNickname}님이 ${card.streakDays}일 연속 인증을 달성했어요.`
    : `${card.userNickname}님의 오늘 인증: "${card.comment || card.title}"`;

/**
 * HTMLRewriter는 속성값의 `"`는 이스케이프하지만 `&`는 그대로 둔다.
 * 사용자 글에 `&quot;` 같은 문자열이 들어오면 파서가 그걸 엔티티로 되돌려 읽으므로
 * `&`만 미리 막아둔다. `<`와 `>`는 따옴표 안에서 특수문자가 아니라 건드릴 필요가 없다.
 */
const escapeAmpersand = (value: string): string => value.replace(/&/g, '&amp;');

/** 나머지 이스케이프는 HTMLRewriter에 맡긴다. */
class AttributeSetter {
  private readonly values: Record<string, string>;
  private readonly keyAttribute: 'property' | 'name';

  constructor(values: Record<string, string>, keyAttribute: 'property' | 'name') {
    this.values = values;
    this.keyAttribute = keyAttribute;
  }

  element(element: Element) {
    const key = element.getAttribute(this.keyAttribute);
    if (!key) return;
    const value = this.values[key];
    if (value !== undefined) {
      element.setAttribute('content', escapeAmpersand(value));
    }
  }
}

class TextSetter {
  private readonly value: string;

  constructor(value: string) {
    this.value = value;
  }

  element(element: Element) {
    element.setInnerContent(this.value);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const match = request.method === 'GET' ? SHARE_PATH.exec(url.pathname) : null;

    if (!match) {
      return env.ASSETS.fetch(request);
    }

    // SPA 셸을 직접 집는다. not_found_handling에 맡기면 Sec-Fetch-Mode에 따라
    // 같은 경로가 200과 307로 갈린다.
    const shell = new Request(new URL('/index.html', url), { method: 'GET' });

    const card = await fetchCard(env, match[1]);
    if (!card) {
      // 없거나 해제된 카드는 SPA가 알아서 안내 화면을 그린다.
      return env.ASSETS.fetch(shell);
    }

    const page = await env.ASSETS.fetch(shell);
    if (!page.ok) return page;

    const title = `dayuse | ${card.title}`;
    const description = describe(card);
    const image = `${env.API_BASE_URL}/public/shares/${encodeURIComponent(card.token)}/og.jpg`;
    const canonical = url.toString();

    const rewritten = new HTMLRewriter()
      .on('title', new TextSetter(title))
      .on(
        'meta[property]',
        new AttributeSetter(
          {
            'og:title': title,
            'og:description': description,
            'og:image': image,
            'og:url': canonical,
          },
          'property'
        )
      )
      .on(
        'meta[name]',
        new AttributeSetter(
          {
            description,
            'twitter:title': title,
            'twitter:description': description,
            'twitter:image': image,
          },
          'name'
        )
      )
      .transform(new Response(page.body, page));

    const headers = new Headers(rewritten.headers);
    headers.set('Content-Type', 'text/html; charset=utf-8');
    // 카드 내용은 스냅샷이라 거의 바뀌지 않는다. 해제 반영은 5분 안에 따라붙는다.
    headers.set('Cache-Control', 'public, max-age=300');

    return new Response(rewritten.body, { status: page.status, headers });
  },
};
