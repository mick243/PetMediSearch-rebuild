import styled from 'styled-components';
import { MdAutoAwesome } from 'react-icons/md';
import { ReviewSummary as ReviewSummaryData } from '../../types/review.type';
import { formatDate } from '../../utils/format';

/*
 * 후기가 5건 이상 쌓인 시설의 AI 요약 카드. 목록 위에 한 장 놓입니다.
 *
 * 서버가 summary 를 null 로 주면 부르는 쪽(pages/Review.tsx)이 아예 그리지 않습니다.
 * 몇 건을 근거로 했고 언제 만든 글인지가 보여야 합니다 — 사람이 쓴 후기처럼 보이면
 * 안 되고, 후기가 막 달린 직후에는 그 글이 아직 반영 전일 수 있어서입니다.
 */
function ReviewSummary({ summary }: { summary: ReviewSummaryData }) {
  const hasPoints = summary.good.length > 0 || summary.caution.length > 0;

  return (
    <Card aria-label="AI 후기 요약">
      <div className="head">
        <span className="badge">
          <MdAutoAwesome aria-hidden />
          AI 요약
        </span>
        <span className="meta">
          후기 {summary.review_count}건 기준 · {formatDate(summary.updated_at)}{' '}
          갱신
        </span>
      </div>

      <p className="body">{summary.summary}</p>

      {hasPoints && (
        <div className="points">
          {summary.good.length > 0 && (
            <div>
              <h4>좋았다는 점</h4>
              <ul>
                {summary.good.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            </div>
          )}
          {summary.caution.length > 0 && (
            <div>
              <h4>아쉬웠다는 점</h4>
              <ul>
                {summary.caution.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <p className="note">
        여러 후기를 AI 가 간추린 글이라 실제와 다를 수 있습니다. 아래 개별
        후기를 함께 확인해 주세요.
      </p>
    </Card>
  );
}

const Card = styled.section`
  width: 100%;
  box-sizing: border-box;
  padding: ${({ theme }) => theme.space.md};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.text};
  /* 후기 본문처럼 띄어쓰기 없는 긴 토막이 올 수 있습니다 (후기 목록과 같은 조합). */
  word-break: keep-all;
  overflow-wrap: anywhere;

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({ theme }) => theme.space.sm};
    flex-wrap: wrap;
    margin-bottom: ${({ theme }) => theme.space.sm};
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: ${({ theme }) => theme.radius.pill};
    background-color: ${({ theme }) => theme.color.accent};
    color: ${({ theme }) => theme.color.primary};
    font-size: 11px;
    font-weight: 700;
    svg {
      font-size: 13px;
    }
  }

  .meta {
    font-size: 10px;
    color: ${({ theme }) => theme.color.textMuted};
  }

  .body {
    margin: 0;
    font-size: 12px;
    line-height: 1.6;
  }

  .points {
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.space.sm};
    margin-top: ${({ theme }) => theme.space.sm};
    padding-top: ${({ theme }) => theme.space.sm};
    border-top: 1px solid ${({ theme }) => theme.color.border};

    h4 {
      margin: 0 0 2px;
      font-size: 11px;
      color: ${({ theme }) => theme.color.textMuted};
    }
    ul {
      margin: 0;
      padding-left: 16px;
      font-size: 11px;
      line-height: 1.5;
    }
  }

  .note {
    margin: ${({ theme }) => theme.space.sm} 0 0;
    font-size: 9px;
    color: ${({ theme }) => theme.color.textMuted};
  }
`;

export default ReviewSummary;
