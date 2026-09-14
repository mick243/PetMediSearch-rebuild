import {
  Children,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import styled from 'styled-components';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi2';

interface Props {
  /** 스크린리더가 읽을 탭 줄 이름. `role="tablist"` 에 붙습니다. */
  label: string;
  /**
   * 지금 고른 탭을 가리키는 값. 값 자체는 쓰지 않고 바뀌었는지만 봅니다 —
   * 바뀌면 고른 탭을 가운데로 끌어옵니다.
   */
  activeKey?: string | number | null;
  /** `styled(SlideTabs)` 로 바깥 줄(여백·구분선)을 꾸밀 수 있게 열어 둡니다. */
  className?: string;
  children: ReactNode;
}

/**
 * 가로로 넘치는 탭 줄.
 *
 * 탭이 화면 폭을 넘으면 손가락으로 밀 수는 있었지만, 마우스만 쓰는 화면에서는
 * 넘어간 탭이 있다는 것조차 보이지 않았습니다. 양끝에 화살표를 세워
 * "더 있다"는 신호와 넘기는 수단을 같이 줍니다.
 *
 * 화살표는 줄과 같은 높이(`top: 0; bottom: 0`)로 세웁니다. 동그란 버튼을
 * 띄우면 탭 하나를 통째로 가려 무엇이 가려졌는지 알 수 없습니다.
 * 밀 곳이 없는 쪽은 아예 그리지 않습니다 — 눌러도 안 움직이는 버튼은
 * 고장으로 읽힙니다.
 *
 * 화살표는 `role="tablist"` 밖에 둡니다. tablist 의 자식은 탭이어야 합니다.
 */
function SlideTabs({ label, activeKey, className, children }: Props) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    /* 끝까지 밀어도 소수점 반올림 탓에 1px 쯤 남습니다. 그만큼 봐 줍니다. */
    const left = el.scrollLeft > 1;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setEdge((prev) =>
      prev.left === left && prev.right === right ? prev : { left, right }
    );
  }, []);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    el.addEventListener('scroll', measure, { passive: true });
    /* 창 폭이 바뀌면 넘치는지 여부가 뒤집힙니다. */
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [measure]);

  /*
   * 탭 개수가 바뀌어도(반려동물 추가, 카테고리 응답 도착) 다시 재야 합니다.
   * 개수는 children 이라 비교할 수단이 마땅치 않아 렌더마다 한 번 봅니다 —
   * 값이 그대로면 setEdge 가 같은 객체를 돌려주고 리렌더는 일어나지 않습니다.
   */
  useEffect(measure);

  /*
   * 고른 탭이 화살표 밑에 깔리지 않게 가운데로 끌어옵니다.
   *
   * 탭 개수도 같이 봅니다. 주소에 ?categoryId=9 를 달고 들어오면 고른 값은
   * 첫 렌더부터 9 지만 카테고리 응답은 그 뒤에 옵니다. 값이 바뀔 때만 보면
   * 끌어올 탭이 아직 없어 그냥 지나가고, 9번 '기타' 를 고른 채 왼쪽 끝에
   * 머물러 있었습니다.
   */
  const count = Children.count(children);
  useEffect(() => {
    const el = stripRef.current;
    const active = el?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!el || !active) return;
    /*
     * scrollIntoView 는 조상까지 거슬러 올라가 페이지 세로 위치도 건드립니다.
     * 탭을 눌렀을 뿐인데 화면이 위아래로 튀어서, 이 줄만 직접 옮깁니다.
     */
    el.scrollTo({
      left: active.offsetLeft - (el.clientWidth - active.offsetWidth) / 2,
      behavior: 'smooth',
    });
  }, [activeKey, count]);

  const slide = (direction: -1 | 1) => {
    const el = stripRef.current;
    if (!el) return;
    /* 한 화면을 다 넘기지 않습니다. 끝 탭이 걸쳐 남아야 이어지는 게 보입니다. */
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <Wrap className={className}>
      <Strip ref={stripRef} role="tablist" aria-label={label}>
        {children}
      </Strip>
      {edge.left && (
        <Arrow
          type="button"
          $side="left"
          aria-label="이전 탭 보기"
          onClick={() => slide(-1)}
        >
          <HiChevronLeft aria-hidden="true" />
        </Arrow>
      )}
      {edge.right && (
        <Arrow
          type="button"
          $side="right"
          aria-label="다음 탭 보기"
          onClick={() => slide(1)}
        >
          <HiChevronRight aria-hidden="true" />
        </Arrow>
      )}
    </Wrap>
  );
}

const Wrap = styled.div`
  position: relative;
`;

const Strip = styled.div`
  /* 탭의 offsetLeft 를 이 줄 기준으로 읽으려고 세웁니다(가운데 정렬 계산). */
  position: relative;
  display: flex;
  gap: ${({ theme }) => theme.space.sm};
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const Arrow = styled.button<{ $side: 'left' | 'right' }>`
  position: absolute;
  top: 0;
  bottom: 0;
  ${({ $side }) => ($side === 'left' ? 'left: 0;' : 'right: 0;')}
  display: grid;
  place-items: center;
  width: 34px;
  padding: 0;
  border: 0;
  /*
   * 안쪽으로 갈수록 투명해집니다. 탭이 화살표 밑으로 사라지는 게 보여야
   * 잘린 게 아니라 더 있다는 뜻으로 읽힙니다. 시작색은 탭 줄이 놓인
   * 바닥색(surface)과 같아야 합니다.
   */
  background: ${({ theme, $side }) =>
    `linear-gradient(to ${$side === 'left' ? 'right' : 'left'}, ${
      theme.color.surface
    } 0%, ${theme.color.surface} 60%, transparent 100%)`};
  color: ${({ theme }) => theme.color.textMuted};
  font-size: 20px;
  line-height: 0;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.color.text};
  }
`;

export default SlideTabs;
