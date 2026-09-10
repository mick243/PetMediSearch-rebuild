import styled from 'styled-components';

function Footer() {
  return (
    <FooterStyle>
      <p>
        ⓒ 2026. PetMediSearch. <br />
        All rights reserved.
      </p>
    </FooterStyle>
  );
}

const FooterStyle = styled.div`
  display: flex;
  padding-top: 5px;
  padding-bottom: 5px;
  width: 100%;
  height: 30px;
  justify-content: flex-end;
  align-items: center;
  border-top: 1px solid ${({ theme }) => theme.color.border};
  color: ${({ theme }) => theme.color.textMuted};

  p {
    padding-right: 10px;
    text-align: right;
    font-size: 10px;
    font-style: italic;
    font-weight: lighter;
  }
`;

export default Footer;
