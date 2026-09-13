import { ReactNode } from 'react';
import styled from 'styled-components';

/*
 * 약관·방침 화면의 공통 틀.
 *
 * 두 문서가 같은 모양이어야 읽는 사람이 어디를 봐야 하는지 헷갈리지 않습니다.
 */

interface Props {
  title: string;
  /** 시행일. 문서를 고칠 때마다 함께 올려야 합니다. */
  effectiveDate: string;
  children: ReactNode;
}

function LegalLayout({ title, effectiveDate, children }: Props) {
  return (
    <Page>
      <Head>
        <h1>{title}</h1>
        <p className="date">시행일: {effectiveDate}</p>
      </Head>
      <Body>{children}</Body>
    </Page>
  );
}

/**
 * 서비스에 올리기 전에 채워야 하는 칸.
 *
 * 눈에 띄게 칠해 둡니다. 흐린 회색으로 두면 그대로 배포됩니다 — 법적 문서에
 * "[운영자 이름]" 이 남아 있는 화면은 아무 문서도 없는 것보다 나쁩니다.
 */
export const Todo = styled.mark`
  padding: 1px 6px;
  border-radius: 3px;
  background-color: #fff3bf;
  color: #8a6d00;
  font-weight: 700;
  font-size: 0.95em;
`;

const Page = styled.section`
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 0 ${({ theme }) => theme.space.lg} ${({ theme }) => theme.space.xxl};
  background-color: ${({ theme }) => theme.color.surface};
  font-family: ${({ theme }) => theme.font.body};
`;

const Head = styled.div`
  padding-bottom: ${({ theme }) => theme.space.md};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};

  h1 {
    margin: 0;
    font-family: ${({ theme }) => theme.font.body};
    font-size: 19px;
    font-weight: 700;
  }

  .date {
    margin: 6px 0 0;
    font-size: 12px;
    color: ${({ theme }) => theme.color.textMuted};
    font-variant-numeric: tabular-nums;
  }
`;

const Body = styled.div`
  font-size: 13px;
  line-height: 1.75;
  color: ${({ theme }) => theme.color.text};

  h2 {
    margin: ${({ theme }) => `${theme.space.xl} 0 ${theme.space.sm}`};
    font-family: ${({ theme }) => theme.font.body};
    font-size: 15px;
    font-weight: 700;
  }

  h3 {
    margin: ${({ theme }) => `${theme.space.lg} 0 ${theme.space.xs}`};
    font-family: ${({ theme }) => theme.font.body};
    font-size: 13px;
    font-weight: 700;
    color: ${({ theme }) => theme.color.text};
  }

  p {
    margin: 0 0 ${({ theme }) => theme.space.sm};
  }

  ul,
  ol {
    margin: 0 0 ${({ theme }) => theme.space.sm};
    padding-left: 20px;
  }

  li {
    margin-bottom: 4px;
  }

  a {
    color: ${({ theme }) => theme.color.text};
    font-weight: 600;
  }

  /* 표는 좁은 화면에서 옆으로 넘칩니다. 표만 따로 스크롤하게 둡니다. */
  .table-wrap {
    overflow-x: auto;
    margin-bottom: ${({ theme }) => theme.space.sm};
  }

  table {
    width: 100%;
    min-width: 380px;
    border-collapse: collapse;
    font-size: 12px;
  }

  th,
  td {
    padding: 8px 10px;
    border: 1px solid ${({ theme }) => theme.color.border};
    text-align: left;
    vertical-align: top;
  }

  th {
    background-color: ${({ theme }) => theme.color.surfaceMuted};
    font-weight: 600;
    white-space: nowrap;
  }

  /* 특히 눈에 띄어야 하는 문단 (면책·한계) */
  .callout {
    margin: ${({ theme }) => `${theme.space.md} 0`};
    padding: ${({ theme }) => theme.space.md};
    border-left: 3px solid ${({ theme }) => theme.color.danger};
    background-color: ${({ theme }) => theme.color.surfaceMuted};
    font-size: 12.5px;
  }
`;

export default LegalLayout;
