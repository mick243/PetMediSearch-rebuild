import './App.css';
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from 'react-router-dom';
import Home from './pages/Home';
import Search from './pages/Search';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Layout from './layout/Layout';
import Error from './components/common/Error';
import Posts from './pages/Posts';
import LoginRedirectKakao from './pages/loginRedirect/LoginRedirectKakao';
import LoginRedirectNaver from './pages/loginRedirect/LoginRedirectNaver';
import LoginRedirectGoogle from './pages/loginRedirect/LoginRedirectGoogle';
import { PetMediThemeProvider } from './style/themeContext';
import MyProfile from './pages/MyProfile';
import LoginProtect from './components/common/LoginProtect';
import Review from './pages/Review';
import CreatePost from './pages/CreatePost';
import PostDetail from './pages/PostDetail';
import PetForm from './pages/PetForm';
import Favorites from './pages/Favorites';
import Vaccinations from './pages/Vaccinations';

const routeList = [
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/search',
    element: <Search />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/signup',
    element: <Signup />,
  },
  {
    // 카테고리 화면은 게시판 탭으로 흡수됐습니다. 예전 주소는 통합(전체 글)로 보냅니다.
    path: '/category',
    element: <Navigate to="/posts" replace />,
  },
  {
    path: '/posts',
    element: <Posts />,
  },
  {
    path: '/posts/:id',
    element: <PostDetail />,
  },
  {
    path: '/createpost',
    element: <CreatePost />,
  },
  {
    path: '/oauth/kakao',
    element: <LoginRedirectKakao />,
  },
  {
    path: '/oauth/naver',
    element: <LoginRedirectNaver />,
  },
  {
    path: '/oauth/google',
    element: <LoginRedirectGoogle />,
  },
  {
    path: '/pets/new',
    element: (
      <LoginProtect>
        <PetForm />
      </LoginProtect>
    ),
  },
  {
    path: '/pets/:id/edit',
    element: (
      <LoginProtect>
        <PetForm />
      </LoginProtect>
    ),
  },
  {
    path: '/vaccinations',
    element: (
      <LoginProtect>
        <Vaccinations />
      </LoginProtect>
    ),
  },
  {
    path: '/favorites',
    element: (
      <LoginProtect>
        <Favorites />
      </LoginProtect>
    ),
  },
  {
    path: '/myprofile',
    element: (
      <LoginProtect>
        <MyProfile />
      </LoginProtect>
    ),
  },
  {
    path: '/Review',
    element: (
      <LoginProtect>
        <Review />
      </LoginProtect>
    ),
  },
];

const router = createBrowserRouter(
  routeList.map((item) => {
    return {
      ...item,
      element: <Layout>{item.element}</Layout>,
      errorElement: <Error />,
    };
  })
);

function App() {
  return (
    <PetMediThemeProvider>
      <RouterProvider router={router} />
    </PetMediThemeProvider>
  );
}

export default App;
