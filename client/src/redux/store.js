import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { composeWithDevTools } from 'redux-devtools-extension';
import { rootReducer } from './rootReducer';

// ✅ helper seguro (evita pantalla en blanco por JSON.parse(null))
const safeParse = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return parsed ?? fallback;
    } catch (e) {
        return fallback;
    }
};

const finalReducer = combineReducers({
    rootReducer,
});

const initialState = {
    rootReducer: {
        cartItems: safeParse('cartItems', []),
        loading: false,
    },
};

const middleware = [thunk];

const store = createStore(finalReducer, initialState, composeWithDevTools(applyMiddleware(...middleware)));

export default store;