import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import styled, { createGlobalStyle } from 'styled-components';
import { useSelector } from 'react-redux';
import { FaRegSmile } from 'react-icons/fa';
import { Comment } from '../types/post.type';
import { RootState } from '../store';
import { addComment, deleteComment } from '../apis/Comment.api';
import { getEmoticons } from '../apis/emoticon.api';
import { Emoticon } from '../types/emoticon.type';
import { emoticonToken, TOKEN_BEFORE_CARET } from '../utils/emoticon';
import { formatDateTime } from '../utils/postContent';
import PaginationComp from '../components/common/PaginationComp';
import { apiErrorMessage } from '../utils/apiError';
import EmoticonPicker from './EmoticonPicker';
import CommentText from './CommentText';

const BASE_URL = import.meta.env.VITE_BASE_URL;
const PER_PAGE = 5;

interface Props {
  postId: number;
  /** 게시글 작성자. 이 사람이 남긴 댓글은 다른 색으로 보여줍니다. */
  postAuthorId?: number;
}

/** 원댓글 하나와 거기 달린 답글들. */
interface Thread {
  comment: Comment;
  replies: Comment[];
}

/**
 * 게시글 상세의 댓글 영역.
 *
 * 예전에는 입력 폼은 PostDetail 이, 목록은 CommentList 가 따로 들고 있어서
 * 댓글을 남겨도 목록이 갱신되지 않았습니다. 한 곳에서 같이 다룹니다.
 */
export default function CommentSection({ postId, postAuthorId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  /** 스레드 수. 쪽 번호를 그리는 데 씁니다. */
  const [threadCount, setThreadCount] = useState(0);
  /** 이 글의 전체 댓글 수. 머리말의 "댓글 N개" 입니다. */
  const [commentCount, setCommentCount] = useState(0);
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState('');
  /** 답글을 달 원댓글. null 이면 새 댓글입니다. */
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [sending, setSending] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLFormElement>(null);
  const emoticonBtRef = useRef<HTMLButtonElement>(null);

  /*
   * 이모티콘 목록. 그림은 들어 있지 않고 id·이름만입니다.
   *
   * 피커를 열 때가 아니라 화면에 들어올 때 받아 옵니다 — 댓글에 이미 들어 있는
   * 이모티콘의 대체 텍스트로도 쓰기 때문입니다. 응답이 작고(수백 바이트) 서버가
   * 1분 캐시를 걸어 두어, 연이어 글을 여러 개 열어도 요청은 한 번뿐입니다.
   */
  const [emoticons, setEmoticons] = useState<Emoticon[]>([]);
  const [emoticonsLoading, setEmoticonsLoading] = useState(true);
  const [emoticonsFailed, setEmoticonsFailed] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    getEmoticons()
      .then((rows) => alive && setEmoticons(rows))
      .catch((error) => {
        console.error('이모티콘을 불러오지 못했습니다:', error);
        if (alive)
          setEmoticonsFailed(
            apiErrorMessage(error, '이모티콘을 불러오지 못했습니다.')
          );
      })
      .finally(() => alive && setEmoticonsLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  /* 댓글이 번호로만 가리키므로, 이름과 지문을 꺼내 쓰려면 번호로 찾을 수 있어야 합니다. */
  const emoticonById = useMemo(
    () => new Map(emoticons.map((e) => [e.emoticon_id, e])),
    [emoticons]
  );

  /**
   * 이모티콘을 넣은 뒤 커서를 둘 자리.
   *
   * 값이 바뀐 다음에 옮겨야 합니다. 넣자마자 옮기면 아직 짧은 예전 값에 맞춰
   * 잘려서 맨 뒤로 튑니다.
   */
  const caretAfterInsert = useRef<number | null>(null);

  useEffect(() => {
    if (caretAfterInsert.current === null) return;
    const el = inputRef.current;
    const at = caretAfterInsert.current;
    caretAfterInsert.current = null;
    el?.focus();
    el?.setSelectionRange(at, at);
  }, [draft]);

  const insertEmoticon = (emoticon: Emoticon) => {
    const token = emoticonToken(emoticon.emoticon_id);
    const el = inputRef.current;
    /* 고르려고 칸에서 초점이 떠나도 마지막 커서 자리는 남아 있습니다. */
    const from = el?.selectionStart ?? draft.length;
    const to = el?.selectionEnd ?? from;

    setDraft(draft.slice(0, from) + token + draft.slice(to));
    caretAfterInsert.current = from + token.length;
    setPickerOpen(false);
  };

  const closePicker = useCallback(() => setPickerOpen(false), []);

  /*
   * 마우스·키보드 환경에서는 Enter 로 보냅니다(예전 input 과 같게). 줄바꿈은 Shift+Enter.
   * 터치 기기에서는 Enter 가 줄바꿈입니다 — 자판의 확인 키를 보내기로 쓰면 여러 줄을
   * 쓸 방법이 없습니다. 한글 조합 중(isComposing)의 Enter 는 조합 확정이라 건너뜁니다.
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    /*
     * 이모티콘 표시는 한 글자처럼 지웁니다. 한 자씩 지우면 [emoticon:12 처럼
     * 부서진 채로 남아, 그림이던 것이 갑자기 글자로 보입니다.
     */
    if (e.key === 'Backspace' && !e.nativeEvent.isComposing) {
      const el = e.currentTarget;
      if (el.selectionStart === el.selectionEnd) {
        const before = draft.slice(0, el.selectionStart);
        const matched = TOKEN_BEFORE_CARET.exec(before);
        if (matched) {
          e.preventDefault();
          const at = before.length - matched[0].length;
          setDraft(before.slice(0, at) + draft.slice(el.selectionEnd));
          caretAfterInsert.current = at;
          return;
        }
      }
    }

    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    e.preventDefault();
    composerRef.current?.requestSubmit();
  };
  /*
   * 떠 있는 입력창이 푸터를 가리지 않게 그 높이만큼 화면 아래를 비웁니다.
   * 답글 배너가 뜨면 바가 높아지므로 값을 고정하지 않고 실제 높이를 잽니다.
   */
  const [composerHeight, setComposerHeight] = useState(0);

  useEffect(() => {
    const el = composerRef.current;
    if (!el) return undefined;
    const measure = () => setComposerHeight(el.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const user = useSelector((state: RootState) => state.auth.user);
  const isLoggedIn = !!user?.id;
  /** 관리자는 작성자와 상관없이 댓글을 지울 수 있습니다. */
  const isAdmin = isLoggedIn && user.role === 'admin';

  /*
   * 보고 있는 쪽만 받아옵니다.
   *
   * 서버가 스레드(원댓글 + 거기 달린 답글) 단위로 잘라 주므로, 답글이 부모와
   * 떨어져 사라지는 일이 없습니다. 예전에는 한 글의 댓글을 전부 받아 화면에서
   * 잘라 썼습니다.
   */
  const fetchComments = useCallback(
    async (which: number) => {
      try {
        const res = await axios.get<{
          comments: Comment[];
          total: number;
          count: number;
        }>(`${BASE_URL}/comments/${postId}?page=${which}&limit=${PER_PAGE}`);
        setComments(res.data.comments ?? []);
        setThreadCount(res.data.total ?? 0);
        setCommentCount(res.data.count ?? 0);
        return res.data.total ?? 0;
      } catch (error) {
        console.error('댓글을 불러오지 못했습니다:', error);
        setComments([]);
        return 0;
      }
    },
    [postId]
  );

  /* 글을 바꾸면 첫 쪽부터 봅니다. */
  useEffect(() => {
    setPage(1);
  }, [postId]);

  useEffect(() => {
    fetchComments(page);
  }, [fetchComments, page]);

  /*
   * 서버는 댓글을 평평하게 내려주고 parent_comment_id 로만 관계를 표시합니다.
   * 답글의 답글까지 계속 들여쓰면 좁은 화면에서 읽기 어려워, 2단으로만 묶습니다.
   */
  const threads = useMemo<Thread[]>(() => {
    const byId = new Map(comments.map((c) => [c.comment_id, c]));

    /*
     * 부모가 목록에 없으면 이 댓글이 원댓글 자리에 섭니다.
     *
     * 부모를 지우면 행은 남고 조회에서만 빠지므로(soft delete) 답글의
     * parent_comment_id 는 그대로입니다. 매달릴 곳이 없다고 건너뛰면
     * 답글이 화면에서 통째로 사라져서, 원댓글로 올려 그립니다.
     */
    const isRoot = (c: Comment) =>
      !c.parent_comment_id || !byId.has(c.parent_comment_id);

    const roots = comments.filter(isRoot);
    const threadOf = new Map<number, Thread>(
      roots.map((c) => [c.comment_id, { comment: c, replies: [] }])
    );

    comments
      .filter((c) => !isRoot(c))
      .forEach((c) => {
        // 답글의 답글이면 타고 올라가 맨 위 원댓글을 찾습니다.
        let root = byId.get(c.parent_comment_id as number) as Comment;
        for (let i = 0; i < 10 && !isRoot(root); i += 1) {
          root = byId.get(root.parent_comment_id as number) as Comment;
        }
        threadOf.get(root.comment_id)?.replies.push(c);
      });

    return roots.map((c) => threadOf.get(c.comment_id) as Thread);
  }, [comments]);

  /** 답글이 누구에게 단 것인지 표시하려면 원댓글 작성자 이름이 필요합니다. */
  const authorById = useMemo(
    () => new Map(comments.map((c) => [c.comment_id, c.author])),
    [comments]
  );

  const startReply = (comment: Comment) => {
    setReplyTo(comment);
    inputRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      alert('로그인 후 댓글을 남길 수 있습니다.');
      return;
    }
    if (!draft.trim() || sending) return;

    const wasReply = replyTo !== null;

    setSending(true);
    try {
      await addComment(
        user.id,
        postId,
        draft.trim(),
        replyTo?.comment_id ?? null
      );
      setDraft('');
      setReplyTo(null);

      const total = await fetchComments(page);
      /*
       * 새 원댓글은 맨 뒤에 붙습니다. 보던 쪽에 그대로 두면 방금 쓴 글이
       * 안 보여 등록이 안 된 것처럼 읽힙니다. 마지막 쪽으로 옮겨 줍니다.
       * 답글은 원래 스레드에 붙으므로 보던 자리를 지킵니다.
       */
      if (!wasReply) {
        const last = Math.max(1, Math.ceil(total / PER_PAGE));
        if (last !== page) setPage(last);
      }
    } catch (error: any) {
      alert(apiErrorMessage(error, '댓글을 등록하지 못했습니다.'));
    } finally {
      setSending(false);
    }
  };

  /**
   * 이 댓글에 달린 답글 id 들. 답글의 답글까지 따라갑니다.
   *
   * 관리자가 지우면 서버가 여기까지 함께 지우므로, 몇 개가 사라지는지 미리 알려주려고 셉니다.
   * parent 가 고리를 이루더라도 멈추도록 한 번 본 것은 다시 보지 않습니다.
   */
  const descendantIds = (commentId: number) => {
    const found = new Set<number>();
    const queue = [commentId];
    while (queue.length > 0) {
      const id = queue.shift() as number;
      comments.forEach((c) => {
        if (c.parent_comment_id === id && !found.has(c.comment_id)) {
          found.add(c.comment_id);
          queue.push(c.comment_id);
        }
      });
    }
    return found;
  };

  const handleDelete = async (comment: Comment) => {
    const mine = isLoggedIn && comment.user_id === user.id;
    /* 관리자 삭제만 답글까지 지웁니다. 본인 삭제는 그 댓글 하나뿐입니다. */
    const removed = isAdmin
      ? descendantIds(comment.comment_id)
      : new Set<number>();
    const owner = mine ? '' : `${comment.author}님의 `;
    const message = !isAdmin
      ? '댓글을 삭제하시겠습니까?'
      : removed.size > 0
        ? `관리자 권한으로 ${owner}댓글과 달린 답글 ${removed.size}개를 함께 삭제합니다. 계속할까요?`
        : `관리자 권한으로 ${owner}댓글을 삭제합니다. 계속할까요?`;

    if (!window.confirm(message)) return;
    try {
      await deleteComment(comment.comment_id);
      removed.add(comment.comment_id);
      // 답글을 쓰던 중이었는데 그 대상이 이번에 사라졌을 수 있습니다.
      if (replyTo && removed.has(replyTo.comment_id)) setReplyTo(null);

      const total = await fetchComments(page);
      // 마지막 스레드를 지워 이 쪽이 비면 한 쪽 앞으로 물러납니다.
      const last = Math.max(1, Math.ceil(total / PER_PAGE));
      if (page > last) setPage(last);
    } catch (error: any) {
      alert(apiErrorMessage(error, '댓글을 삭제하지 못했습니다.'));
    }
  };

  /**
   * 댓글 한 줄.
   *
   * rootId 를 주면 답글로 그립니다. 답글의 답글이면(부모가 원댓글이 아니면)
   * 누구에게 단 답글인지 알 수 없어, 대상 닉네임을 앞에 붙입니다.
   */
  const renderComment = (comment: Comment, rootId?: number) => {
    const mine = isLoggedIn && comment.user_id === user.id;
    /* 관리자가 남의 댓글을 지우는 경우. 실수로 누르지 않도록 버튼에 표시합니다. */
    const deletingAsAdmin = isAdmin && !mine;
    const isReply = rootId !== undefined;
    const byPostAuthor =
      postAuthorId !== undefined && comment.user_id === postAuthorId;
    const mentionTo =
      isReply && comment.parent_comment_id !== rootId
        ? authorById.get(comment.parent_comment_id as number)
        : undefined;

    return (
      <Item key={comment.comment_id} $reply={isReply} $author={byPostAuthor}>
        {/* 댓글이든 답글이든 누르면 그 대상에 답글을 답니다. */}
        <Tap
          role="button"
          tabIndex={0}
          aria-label={`${comment.author}님의 ${isReply ? '답글' : '댓글'}에 답글 달기`}
          onClick={() => startReply(comment)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              startReply(comment);
            }
          }}
        >
          <Author $author={byPostAuthor}>
            {isReply && <Arrow aria-hidden="true">↳</Arrow>}
            {comment.author}
            {byPostAuthor && <AuthorTag>작성자</AuthorTag>}
          </Author>
          <Text>
            {mentionTo && <Mention>@{mentionTo} </Mention>}
            <CommentText content={comment.content} emoticons={emoticonById} />
          </Text>
        </Tap>
        <Foot>
          <Time>{formatDateTime(comment.created_at)}</Time>
          {(mine || deletingAsAdmin) && (
            <DeleteBt type="button" onClick={() => handleDelete(comment)}>
              {deletingAsAdmin ? '삭제 (관리자)' : '삭제'}
            </DeleteBt>
          )}
        </Foot>
      </Item>
    );
  };

  return (
    <Section>
      <BottomSpace $height={composerHeight} />
      <CountRow>댓글 {commentCount}개</CountRow>

      <List>
        {threads.length === 0 ? (
          <EmptyRow>첫 댓글을 남겨보세요.</EmptyRow>
        ) : (
          threads.map(({ comment, replies }) => (
            <Thread key={comment.comment_id}>
              {renderComment(comment)}
              {replies.map((reply) => renderComment(reply, comment.comment_id))}
            </Thread>
          ))
        )}
      </List>

      {threadCount > PER_PAGE && (
        <PaginationComp
          totalItemsCount={threadCount}
          itemsCountPerPage={PER_PAGE}
          currentPage={page}
          onPageChange={setPage}
        />
      )}

      <Composer ref={composerRef} onSubmit={handleSubmit}>
        {pickerOpen && (
          <EmoticonPicker
            emoticons={emoticons}
            loading={emoticonsLoading}
            failed={emoticonsFailed}
            anchorRef={emoticonBtRef}
            onPick={insertEmoticon}
            onClose={closePicker}
          />
        )}
        {replyTo && (
          <ReplyBanner>
            <span>{replyTo.author}님에게 답글 남기는 중</span>
            <CancelReply
              type="button"
              onClick={() => setReplyTo(null)}
              aria-label="답글 취소"
            >
              ✕
            </CancelReply>
          </ReplyBanner>
        )}
        <ComposerRow>
          <FieldBox>
            <FieldLabel>
              <Field
                ref={inputRef}
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isLoggedIn ? '댓글 입력' : '로그인 후 댓글을 남길 수 있어요'
                }
                aria-label="댓글 입력"
              />
            </FieldLabel>
            <EmoticonBt
              ref={emoticonBtRef}
              type="button"
              onClick={() => setPickerOpen((open) => !open)}
              aria-label="이모티콘"
              aria-expanded={pickerOpen}
              $on={pickerOpen}
            >
              <FaRegSmile />
            </EmoticonBt>
          </FieldBox>
          <SendBt type="submit" disabled={!draft.trim() || sending}>
            등록
          </SendBt>
        </ComposerRow>
      </Composer>
    </Section>
  );
}

const Section = styled.section`
  display: flex;
  flex-direction: column;
  flex: 1;
  font-family: ${({ theme }) => theme.font.body};
`;

/* 구분선 위의 댓글 수. */
const CountRow = styled.h2`
  margin: 0;
  padding: ${({ theme }) => `${theme.space.md} ${theme.space.lg}`};
  border-top: 1px solid ${({ theme }) => theme.color.border};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  font-family: ${({ theme }) => theme.font.body};
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
  font-variant-numeric: tabular-nums;
`;

const List = styled.div`
  flex: 1;
`;

const Thread = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
`;

const Item = styled.div<{ $reply: boolean; $author: boolean }>`
  display: grid;
  gap: 6px;
  padding: ${({ theme }) => `${theme.space.md} ${theme.space.lg}`};
  padding-left: ${({ theme, $reply }) =>
    $reply ? `calc(${theme.space.lg} + 22px)` : theme.space.lg};
  /* 글쓴이가 단 것만 배경으로 구분합니다. 일반 댓글·답글은 바탕 그대로. */
  background-color: ${({ theme, $author }) =>
    $author ? theme.color.surfaceMuted : theme.color.surface};

  /* 답글임을 들여쓰기와 함께 세로선으로 표시합니다. */
  ${({ $reply, theme }) =>
    $reply &&
    `
      border-left: 2px solid ${theme.color.border};
      margin-left: ${theme.space.lg};
    `}
`;

const Tap = styled.div`
  display: grid;
  gap: 4px;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.sm};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.primary};
    outline-offset: 3px;
  }
`;

const Author = styled.strong<{ $author: boolean }>`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: ${({ $author }) => ($author ? 700 : 600)};
  color: ${({ theme }) => theme.color.text};
`;

/** 답글임을 나타내는 화살표. */
const Arrow = styled.span`
  color: ${({ theme }) => theme.color.textMuted};
  font-weight: 400;
  line-height: 1;
`;

/** 글쓴이 표시. 색만으로는 구분이 안 되는 경우를 위해 글자도 답니다. */
const AuthorTag = styled.span`
  padding: 0 5px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background-color: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.text};
  font-size: 10px;
  font-weight: 600;
`;

/** 답글의 답글에서 누구에게 단 것인지. */
const Mention = styled.span`
  margin-right: 4px;
  color: ${({ theme }) => theme.color.primary};
  font-weight: 600;
`;

const Text = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: ${({ theme }) => theme.color.text};
  white-space: pre-wrap;
  word-break: keep-all;
  overflow-wrap: anywhere;
`;

/* 시각은 왼쪽, 삭제는 오른쪽 아래. */
const Foot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.sm};
`;

const Time = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.textMuted};
  font-variant-numeric: tabular-nums;
`;

const DeleteBt = styled.button`
  padding: 2px 8px;
  border: 1px solid ${({ theme }) => theme.color.borderStrong};
  border-radius: ${({ theme }) => theme.radius.pill};
  background-color: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.danger};
  font-family: ${({ theme }) => theme.font.body};
  font-size: 12px;
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.color.surfaceMuted};
  }
`;

const EmptyRow = styled.p`
  margin: 0;
  padding: ${({ theme }) => theme.space.xxl} ${({ theme }) => theme.space.lg};
  text-align: center;
  font-size: 14px;
  color: ${({ theme }) => theme.color.textMuted};
`;

/*
 * 입력창은 화면 아래에 떠 있습니다. 스크롤해도 자리가 그대로입니다.
 * Layout 이 415px 열로 가운데 정렬돼 있어, 뷰포트가 아니라 그 열에 맞춥니다.
 */
const Composer = styled.form`
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 415px;
  z-index: 20;
  background-color: ${({ theme }) => theme.color.surface};
  border-top: 1px solid ${({ theme }) => theme.color.border};
  box-shadow: ${({ theme }) => theme.shadow.md};
`;

/*
 * 떠 있는 입력창이 푸터를 가리지 않도록 Layout 아래쪽을 그만큼 비웁니다.
 *
 * body 에 padding 을 주면 Layout 이 min-height:100vh 라 푸터는 그대로 화면 맨 아래에
 * 남아 바에 가립니다. 여백은 Layout 안쪽에 있어야 푸터가 위로 올라옵니다.
 * (#root > div 가 Layout 루트입니다.)
 * 이 화면에 있는 동안에만 적용되고 벗어나면 원래대로 돌아갑니다.
 */
const BottomSpace = createGlobalStyle<{ $height: number }>`
  #root > div {
    box-sizing: border-box;
    padding-bottom: ${({ $height }) => $height}px;
  }
`;

const ReplyBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => `6px ${theme.space.lg}`};
  background-color: ${({ theme }) => theme.color.surfaceMuted};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  font-size: 12px;
  color: ${({ theme }) => theme.color.textMuted};
`;

const CancelReply = styled.button`
  border: 0;
  background: none;
  color: ${({ theme }) => theme.color.textMuted};
  font-size: 13px;
  line-height: 1;
  padding: 4px;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.color.text};
  }
`;

/* 둘 다 높이가 44px 로 고정이라 그냥 가운데로 맞춥니다. */
const ComposerRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => `${theme.space.md} ${theme.space.lg}`};
`;

/*
 * 입력칸의 겉모습(테두리·배경·여백)을 맡는 상자.
 *
 * 44px 로 못박습니다. 손가락으로 누르기 편한 최소 높이입니다 — 예전 input 은
 * 30px 남짓이라 모바일에서 어디를 눌러야 하는지 잘 보이지 않았습니다.
 * 모서리는 둥글리지 않습니다. 알약 모양일 때는 칸이 줄 안에 떠 있는 것처럼
 * 보였는데, 각을 세우면 한 칸을 꽉 채운 것으로 읽힙니다.
 *
 * 여백을 textarea 자신에게 주지 않고 여기로 뺀 이유가 있습니다. 넘치는 내용은
 * padding 의 바깥 경계에서 잘리므로, 칸에 아래 여백 11px 이 있으면 둘째 줄의
 * 윗부분이 딱 그만큼 삐져나와 반쯤 보입니다. 상자와 칸을 나누면 둘째 줄은
 * 칸(딱 한 줄 높이)의 경계에서 통째로 잘려 언제나 한 줄만 보입니다.
 *
 * 이모티콘 버튼도 이 안에 들어옵니다. 줄에 따로 세우면 입력칸이 그만큼 좁아지는데,
 * 상자 안 오른쪽 끝에 두면 등록 버튼 바로 왼쪽이면서 입력칸은 줄을 그대로 씁니다.
 */
const FieldBox = styled.div`
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 4px 0 14px;
  border: 1px solid ${({ theme }) => theme.color.border};
  background-color: ${({ theme }) => theme.color.surfaceMuted};

  &:focus-within {
    border-color: ${({ theme }) => theme.color.primary};
    background-color: ${({ theme }) => theme.color.surface};
  }
`;

/*
 * label 이라 글자가 없는 위아래 여백을 눌러도 칸에 초점이 갑니다.
 * 상자 전체가 아니라 글자 자리만 감쌉니다 — 이모티콘 버튼까지 덮으면 그 버튼을
 * 눌렀을 때 초점이 입력칸으로 끌려갑니다.
 */
const FieldLabel = styled.label`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  align-self: stretch;
  cursor: text;
`;

/*
 * 글자가 들어가는 칸. 높이는 line-height 와 같은 20px — 딱 한 줄입니다.
 *
 * 예전에는 쓴 만큼 칸이 늘어났습니다(JS 가 scrollHeight 를 재서 height 를 올림).
 * 그러면 화면 아래 떠 있는 입력창이 자라면서 댓글 목록을 덮고, 그 높이에 맞춰
 * 본문 아래 여백도 같이 움직여 화면이 출렁였습니다. 이제 칸은 그대로 두고
 * 넘치는 줄은 칸 안에서 스크롤합니다. Shift+Enter 줄바꿈은 그대로 됩니다.
 */
const Field = styled.textarea`
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  height: 20px;
  padding: 0;
  border: 0;
  background: none;
  font-family: ${({ theme }) => theme.font.body};
  font-size: 15px;
  line-height: 20px;
  color: ${({ theme }) => theme.color.text};
  resize: none;
  overflow-y: auto;

  /*
   * 스크롤바는 감춥니다. 한 줄짜리 칸에 막대가 서면 글자 자리를 먹는 데다,
   * 두 줄째부터 나타났다 사라지며 폭이 흔들립니다. 스크롤 자체는 그대로 됩니다.
   */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* 구형 Edge */

  &::-webkit-scrollbar {
    display: none; /* Chrome · Safari */
  }

  &::placeholder {
    color: ${({ theme }) => theme.color.textMuted};
  }

  &:focus {
    outline: none;
  }
`;

/*
 * 이모티콘 피커를 여는 버튼. 입력 상자 안 오른쪽 끝, 등록 버튼 바로 왼쪽입니다.
 * 36px 은 44px 상자 안에 들어가는 한도에서 누를 자리를 최대한 남긴 크기입니다.
 */
const EmoticonBt = styled.button<{ $on: boolean }>`
  flex: none;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: none;
  color: ${({ theme, $on }) =>
    $on ? theme.color.primary : theme.color.textMuted};
  font-size: 19px;
  line-height: 1;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.color.text};
  }
`;

const SendBt = styled.button`
  flex: none;
  height: 44px;
  padding: 0 16px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.pill};
  background-color: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.textInverse};
  font-family: ${({ theme }) => theme.font.body};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    background-color: ${({ theme }) => theme.color.border};
    color: ${({ theme }) => theme.color.textMuted};
    cursor: default;
  }
`;
