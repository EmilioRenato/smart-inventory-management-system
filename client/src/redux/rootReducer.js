const initialState = {
    loading: false,
    cartItems: [],
};

const getSizeKey = item => {
    // Si tiene sizeOrders, tomamos la primera talla (en este sistema: 1 talla por item)
    const size = Array.isArray(item?.sizeOrders) && item.sizeOrders.length > 0 ? String(item.sizeOrders[0]?.size) : 'NO_SIZE';
    return size || 'NO_SIZE';
};

const getCartKey = item => {
    const id = item?._id || '';
    const size = getSizeKey(item);
    return `${id}|${size}`;
};

export const rootReducer = (state = initialState, action) => {
    switch (action.type) {
        case 'SHOW_LOADING':
            return { ...state, loading: true };

        case 'HIDE_LOADING':
            return { ...state, loading: false };

        case 'ADD_TO_CART': {
            const incoming = action.payload || {};
            const cartKey = incoming.cartKey || getCartKey(incoming);

            const payload = { ...incoming, cartKey };

            const existingItem = state.cartItems.find(item => item.cartKey === cartKey);

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
                    item.cartKey === cartKey
                        ? { ...item, quantity: Number(incoming.quantity || 0) }
                        : item
                ),
            };
        }

        // ✅ Esto lo usa tu Cart.jsx (Editar tallas)
        case 'UPDATE_CART_SIZES': {
            const incoming = action.payload || {};
            const cartKey = incoming.cartKey || getCartKey(incoming);

            const sizeOrders = Array.isArray(incoming.sizeOrders) ? incoming.sizeOrders : [];

            // recalcular quantity desde sizeOrders
            const newQty = sizeOrders.reduce((sum, x) => sum + Number(x.quantity || 0), 0);

            return {
                ...state,
                cartItems: state.cartItems.map(item =>
                    item.cartKey === cartKey
                        ? { ...item, sizeOrders, quantity: newQty }
                        : item
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