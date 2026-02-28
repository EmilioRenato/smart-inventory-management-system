const initialState = {
    loading: false,
    cartItems: [],
};

const getCartKey = item => {
    const id = item?._id || '';
    const size = item?.selectedSize ? String(item.selectedSize) : 'NO_SIZE';
    return `${id}|${size}`;
};

export const rootReducer = (state = initialState, action) => {
    switch (action.type) {
        case 'SHOW_LOADING':
            return { ...state, loading: true };

        case 'HIDE_LOADING':
            return { ...state, loading: false };

        case 'ADD_TO_CART': {
            // ✅ IMPORTANTE: ahora el carrito distingue por producto + talla
            const incoming = action.payload || {};
            const cartKey = incoming.cartKey || getCartKey(incoming);
            const payload = { ...incoming, cartKey };

            const existingItem = state.cartItems.find(item => item.cartKey === cartKey);

            // Si ya existe esa talla del mismo producto, sumamos quantity
            if (existingItem) {
                return {
                    ...state,
                    cartItems: state.cartItems.map(item =>
                        item.cartKey === cartKey
                            ? { ...item, quantity: Number(item.quantity || 0) + Number(payload.quantity || 0) }
                            : item
                    ),
                };
            }

            return {
                ...state,
                cartItems: [...state.cartItems, payload],
            };
        }

        case 'UPDATE_CART': {
            const incoming = action.payload || {};
            const cartKey = incoming.cartKey || getCartKey(incoming);

            return {
                ...state,
                cartItems: state.cartItems.map(item =>
                    item.cartKey === cartKey ? { ...item, quantity: Number(incoming.quantity || 0) } : item
                ),
            };
        }

        case 'DELETE_FROM_CART': {
            const incoming = action.payload || {};
            const cartKey = incoming.cartKey || getCartKey(incoming);

            return {
                ...state,
                cartItems: state.cartItems.filter(item => item.cartKey !== cartKey),
            };
        }

        case 'CLEAR_CART':
            return { ...state, cartItems: [] };

        default:
            return state;
    }
};