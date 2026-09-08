import styled from 'styled-components';
import Spinner from './Spinner';

function Loading() {
  return (
    <LoadingStyle>
      <Spinner />
    </LoadingStyle>
  );
}

const LoadingStyle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

export default Loading;
