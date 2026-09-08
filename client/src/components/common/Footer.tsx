import { FaGithubSquare } from 'react-icons/fa';
import styled from 'styled-components';

function Footer() {
  const newPageGithub = () => {
    window.open('https://github.com/PetMediSearch/PetMediSearch');
  };

  return (
    <FooterStyle>
      <FaGithubSquare onClick={newPageGithub} />
      <p>
        ⓒ 2024. PetMediSearch. <br />
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
  justify-content: space-between;
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

  svg {
    margin-left: 10px;
    font-size: 30px;
  }

  svg:hover {
    background-color: ${({ theme }) => theme.color.primary};
    border-radius: 6px;
    color: white;
    cursor: pointer;
  }
`;

export default Footer;
