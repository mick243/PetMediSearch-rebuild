import { useState } from 'react';
import styled from 'styled-components';

export default function CreateCategory({ handleCategory }: any) {
  const [isClickNormal, setIsClickNormal] = useState(false);
  const [isClickDog, setIsClickDog] = useState(false);
  const [isClickCat, setIsClickCat] = useState(false);
  const [isClickRabbit, setIsClickRabbit] = useState(false);
  const [isClickFish, setIsClickFish] = useState(false);
  const [isClickBird, setIsClickBird] = useState(false);
  const [isClickFrog, setIsClickFrog] = useState(false);
  const [isClickReptilia, setIsClickReptilia] = useState(false);

  return (
    <CategoryContainer>
      <CategoryBt
        type="button"
        value={'통합'}
        id={'1'}
        name="iscategory"
        onClick={(e) => {
          handleCategory(e);
          setIsClickNormal(!isClickNormal);
        }}
        style={{
          background: isClickNormal ? '#9E9E9E' : '#D9D9D9',
          color: isClickNormal ? '#fff' : '#fff',
        }}
      />

      <CategoryBt
        type="button"
        value={'강아지'}
        id={'2'}
        name="iscategory"
        onClick={(e) => {
          handleCategory(e);
          setIsClickDog(!isClickDog);
        }}
        style={{
          background: isClickDog ? '#9E9E9E' : '#D9D9D9',
          color: isClickDog ? '#fff' : '#fff',
        }}
      />

      <CategoryBt
        type="button"
        value={'고양이'}
        id={'3'}
        name="iscategory"
        onClick={(e) => {
          handleCategory(e);
          setIsClickCat(!isClickCat);
        }}
        style={{
          background: isClickCat ? '#9E9E9E' : '#D9D9D9',
          color: isClickCat ? '#fff' : '#fff',
        }}
      />
      <CategoryBt
        type="button"
        value={'토끼'}
        id={'4'}
        name="iscategory"
        onClick={(e) => {
          handleCategory(e);
          setIsClickRabbit(!isClickRabbit);
        }}
        style={{
          background: isClickRabbit ? '#9E9E9E' : '#D9D9D9',
          color: isClickRabbit ? '#fff' : '#fff',
        }}
      />
      <CategoryBt
        type="button"
        value={'물고기'}
        id={'5'}
        name="iscategory"
        onClick={(e) => {
          handleCategory(e);
          setIsClickFish(!isClickFish);
        }}
        style={{
          background: isClickFish ? '#9E9E9E' : '#D9D9D9',
          color: isClickFish ? '#fff' : '#fff',
        }}
      />
      <CategoryBt
        type="button"
        value={'새'}
        id={'6'}
        name="iscategory"
        onClick={(e) => {
          handleCategory(e);
          setIsClickBird(!isClickBird);
        }}
        style={{
          background: isClickBird ? '#9E9E9E' : '#D9D9D9',
          color: isClickBird ? '#fff' : '#fff',
        }}
      />
      <CategoryBt
        type="button"
        value={'개구리'}
        id={'7'}
        name="iscategory"
        onClick={(e) => {
          handleCategory(e);
          setIsClickFrog(!isClickFrog);
        }}
        style={{
          background: isClickFrog ? '#9E9E9E' : '#D9D9D9',
          color: isClickFrog ? '#fff' : '#fff',
        }}
      />
      <CategoryBt
        type="button"
        value={'파충류'}
        id={'8'}
        name="iscategory"
        onClick={(e) => {
          handleCategory(e);
          setIsClickReptilia(!isClickReptilia);
        }}
        style={{
          background: isClickReptilia ? '#9E9E9E' : '#D9D9D9',
          color: isClickReptilia ? '#fff' : '#fff',
        }}
      />
    </CategoryContainer>
  );
}

const CategoryContainer = styled.div`
  width: 100%;
  height: 50%;
  display: flex;
  justify-content: flex-start;
  text-align: center;
  gap: 5px;
`;

const CategoryBt = styled.input`
  width: 55px;
  height: 30px;
  border-radius: 10px;
  border: 1px solid #d0d0d0;
  color: #aaa;
  font-size: 13px;
  cursor: pointer;
`;
