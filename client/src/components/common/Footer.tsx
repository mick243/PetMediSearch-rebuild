import styled from 'styled-components';
import { Link } from 'react-router-dom';

/**
 * 푸터.
 *
 * 약관·방침은 어느 화면에서든 닿을 수 있어야 합니다. 가입 화면에만 링크를 두면
 * 이미 가입한 사람은 다시 찾아볼 방법이 없습니다.
 *
 * 시설 데이터 출처도 여기 적습니다. 공공데이터포털 자료를 쓰면서 출처를 밝히지
 * 않으면 이용허락 조건을 어기는 것입니다.
 */
function Footer() {
  return (
    <FooterStyle>
      <nav className="links">
        <Link to="/terms">이용약관</Link>
        <span aria-hidden="true">·</span>
        <Link to="/privacy">
          <strong>개인정보처리방침</strong>
        </Link>
      </nav>
      <p className="source">
        병원·약국 정보 출처: 공공데이터포털(행정안전부 지방행정인허가데이터)
      </p>
      <p className="copy">ⓒ 2026. PetMediSearch. All rights reserved.</p>
    </FooterStyle>
  );
}

const FooterStyle = styled.footer`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  width: 100%;
  box-sizing: border-box;
  padding: ${({ theme }) => `${theme.space.md} ${theme.space.md}`};
  border-top: 1px solid ${({ theme }) => theme.color.border};
  color: ${({ theme }) => theme.color.textMuted};
  text-align: right;

  .links {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;

    a {
      color: ${({ theme }) => theme.color.textMuted};
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    /* 방침은 법에서 늘 보이게 두라고 정한 항목이라 약관보다 또렷하게 둡니다. */
    strong {
      color: ${({ theme }) => theme.color.text};
      font-weight: 600;
    }
  }

  .source {
    margin: 0;
    font-size: 10px;
    line-height: 1.5;
  }

  .copy {
    margin: 0;
    font-size: 10px;
    font-style: italic;
    font-weight: lighter;
  }
`;

export default Footer;
