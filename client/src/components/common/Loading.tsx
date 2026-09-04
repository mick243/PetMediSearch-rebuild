import Lottie from 'lottie-react';
import styled from 'styled-components';
import loadingLottie from '../../assets/lottie/loadingLottie.json';

function Loading() {
  return (
    <LoadingStyle>
      <Lottie animationData={loadingLottie} className="lottie" />
    </LoadingStyle>
  );
}

const LoadingStyle = styled.div`
  lottie {
    width: 100px;
  }
`;

export default Loading;
