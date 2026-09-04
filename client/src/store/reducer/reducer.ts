import { authReducer } from '../slices/authSlice';
import { placeReducer } from '../slices/placeSlice';

const reducer = {
  auth: authReducer,
  place: placeReducer,
};

export default reducer;
