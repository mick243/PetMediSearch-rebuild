import React from 'react';
import styled from 'styled-components';
import { ButtonScheme, ButtonSize } from '../../style/theme';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  size: ButtonSize;
  scheme: ButtonScheme;
  onClick: () => void;
}

function Button({ children, size, scheme, onClick }: Props) {
  return (
    <ButtonStyle size={size} $scheme={scheme} onClick={onClick}>
      {children}
    </ButtonStyle>
  );
}

const ButtonStyle = styled.button<
  Omit<{ size: ButtonSize; $scheme: ButtonScheme }, 'children'>
>`
  cursor: pointer;
  font-size: ${({ theme, size }) => theme.button[size].fontSize};
  padding: ${({ theme, size }) => theme.button[size].padding};
  color: ${({ theme, $scheme }) => theme.buttonScheme[$scheme].color};
  background-color: ${({ theme, $scheme }) =>
    theme.buttonScheme[$scheme].backgroundColor};
  border: 0;
  border-radius: ${({ theme }) => theme.borderRadius.default};
  &:hover {
    color: ${({ theme, $scheme }) => theme.buttonScheme[$scheme].hoverTxtColor};
    background-color: ${({ theme, $scheme }) =>
      theme.buttonScheme[$scheme].hoverBgColor};
  }
  font-family: 'Garam';
  transition:
    background-color 0.3s,
    color 0.3s;
`;

export default Button;
