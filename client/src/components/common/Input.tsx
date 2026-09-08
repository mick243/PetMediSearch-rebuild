import styled from 'styled-components';
import { InputSize } from '../../style/theme';
import React from 'react';

interface Props
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  type: string;
  placeholder: string;
  size: InputSize;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

function Input({ type, placeholder, size, value, onChange, onKeyDown }: Props) {
  return (
    <InputStyle
      type={type}
      placeholder={placeholder}
      size={size}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
    />
  );
}

const InputStyle = styled.input<Props>`
  padding: ${({ theme, size }) => theme.input[size].padding};
  font-size: ${({ theme, size }) => theme.input[size].fontSize};
  border-radius: ${({ theme }) => theme.borderRadius.default};
  width: ${({ theme, size }) => theme.input[size].width};
  height: ${({ theme, size }) => theme.input[size].height};
  font-family: ${({ theme }) => theme.font.body};
  color: ${({ theme }) => theme.color.text};
  background-color: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.borderStrong};
  outline: none;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
  &::placeholder {
    color: ${({ theme }) => theme.color.textMuted};
  }
  &:focus {
    border-color: ${({ theme }) => theme.color.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.color.accent};
    outline: none;
  }
`;

export default Input;
