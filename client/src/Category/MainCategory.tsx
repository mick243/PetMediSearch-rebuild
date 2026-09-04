import styled from 'styled-components';

export default function MainCategory({
  category,
  setCategory,
}: {
  category: any;
  setCategory: React.Dispatch<React.SetStateAction<any>>;
}) {
  const setCat = async (cat: any) => {
    setCategory(cat);
  };

  return (
    <CategoryContainer>
      <CategoryBt
        onClick={() => setCat(1)}
        style={{
          color: category === 1 ? '#333' : '#d0d0d0',
        }}
      >
        All
      </CategoryBt>
      <CategoryBt
        onClick={() => setCat(2)}
        style={{
          color: category === 2 ? '#333' : '#d0d0d0',
        }}
      >
        Dog
      </CategoryBt>
      <CategoryBt
        onClick={() => setCat(3)}
        style={{
          color: category === 3 ? '#333' : '#d0d0d0',
        }}
      >
        Cat
      </CategoryBt>
    </CategoryContainer>
  );
}

const CategoryContainer = styled.div``;

const CategoryBt = styled.div``;
