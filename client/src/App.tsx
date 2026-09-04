import './App.css';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Home from './pages/Home';
import Search from './pages/Search';
import Login from './pages/Login';
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
import Categories from './pages/Category';
import PostDetail from './pages/PostDetail';

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
    path: '/category',
    element: <Categories />,
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
    if (item.path === '/') return item;
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
