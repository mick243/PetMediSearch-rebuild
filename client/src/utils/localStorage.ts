export const getToken = () => {
  const token = localStorage.getItem('token');
  return token;
};

export const setToken = (token: string) => {
  localStorage.setItem('token', token);
};

export const removeToken = () => {
  localStorage.removeItem('token');
};

// user 정보 관련 함수
export const getUser = () => {
  const userData = localStorage.getItem('user');
  return userData ? JSON.parse(userData) : null; // user 정보가 있으면 JSON 파싱, 없으면 null
};

export const setUser = (user: {
  id: number;
  username: string;
  socialType: string;
}) => {
  localStorage.setItem('user', JSON.stringify(user));
};

export const removeUser = () => {
  localStorage.removeItem('user');
};
