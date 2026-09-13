import styled from 'styled-components';
import { Link } from 'react-router-dom';

/*
 * 가입 화면의 필수 동의.
 *
 * 셋 다 필수라 "모두 동의" 하나로 켜고 끌 수 있게 두되, 항목은 접지 않고
 * 펼쳐 놓습니다. 무엇에 동의하는지 읽지 않고 누르게 하는 것이 목적이 아닙니다.
 *
 * 만 14세 확인이 들어가는 이유는 「개인정보 보호법」이 만 14세 미만 아동의
 * 개인정보를 처리하려면 법정대리인의 동의를 받으라고 정하고 있기 때문입니다.
 * 이 서비스는 그 절차가 없으므로 가입 자체를 받지 않습니다.
 */

export interface Consents {
  age: boolean;
  terms: boolean;
  privacy: boolean;
}

export const EMPTY_CONSENTS: Consents = {
  age: false,
  terms: false,
  privacy: false,
};

export const allAgreed = (c: Consents) => c.age && c.terms && c.privacy;

interface Props {
  value: Consents;
  onChange: (next: Consents) => void;
}

function ConsentBox({ value, onChange }: Props) {
  const every = allAgreed(value);

  const toggleAll = (checked: boolean) =>
    onChange({ age: checked, terms: checked, privacy: checked });

  const toggle = (key: keyof Consents, checked: boolean) =>
    onChange({ ...value, [key]: checked });

  return (
    <ConsentStyle>
      <label className="all">
        <input
          type="checkbox"
          checked={every}
          onChange={(e) => toggleAll(e.target.checked)}
        />
        <span>아래 항목에 모두 동의합니다</span>
      </label>

      <ul>
        <li>
          <label>
            <input
              type="checkbox"
              checked={value.age}
              onChange={(e) => toggle('age', e.target.checked)}
            />
            <span>
              <em>[필수]</em> 만 14세 이상입니다
            </span>
          </label>
        </li>
        <li>
          <label>
            <input
              type="checkbox"
              checked={value.terms}
              onChange={(e) => toggle('terms', e.target.checked)}
            />
            <span>
              <em>[필수]</em> <Link to="/terms">이용약관</Link>에 동의합니다
            </span>
          </label>
        </li>
        <li>
          <label>
            <input
              type="checkbox"
              checked={value.privacy}
              onChange={(e) => toggle('privacy', e.target.checked)}
            />
            <span>
              <em>[필수]</em> <Link to="/privacy">개인정보 수집·이용</Link>에
              동의합니다
            </span>
          </label>
        </li>
      </ul>
    </ConsentStyle>
  );
}

const ConsentStyle = styled.div`
  padding: ${({ theme }) => theme.space.md};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  background-color: ${({ theme }) => theme.color.surfaceMuted};

  label {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    cursor: pointer;
  }

  input {
    flex: none;
    width: 16px;
    height: 16px;
    margin: 2px 0 0;
    accent-color: ${({ theme }) => theme.color.primary};
    cursor: pointer;
  }

  .all {
    padding-bottom: ${({ theme }) => theme.space.sm};
    border-bottom: 1px solid ${({ theme }) => theme.color.border};
    font-size: 13px;
    font-weight: 700;
    color: ${({ theme }) => theme.color.text};
  }

  ul {
    margin: ${({ theme }) => theme.space.sm} 0 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 6px;
  }

  li span {
    font-size: 12px;
    color: ${({ theme }) => theme.color.textMuted};
  }

  em {
    font-style: normal;
    font-weight: 700;
    color: ${({ theme }) => theme.color.text};
  }

  a {
    color: ${({ theme }) => theme.color.text};
    font-weight: 600;
  }
`;

export default ConsentBox;
