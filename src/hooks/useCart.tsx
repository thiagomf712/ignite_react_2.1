import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock, ProductApi } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: productStock } = await api.get<Stock>(`/stock/${productId}`);

      if (!productStock) {
        toast.error('Quantidade solicitada fora de estoque');

        return;  
      }
      
      const productOnCart = cart.find((product) => product.id === productId);

      let newCart = cart;

      if (productOnCart) {
        if (productOnCart.amount + 1 > productStock.amount) {
          toast.error('Quantidade solicitada fora de estoque');

          return;  
        }

        newCart = newCart.map((product) => {
          if (product.id === productId) {
            return {
              ...product,
              amount: product.amount + 1,
            }
          }

          return product;
        })
      } else {
        const { data: newProduct } = await api.get<ProductApi>(`/products/${productId}`);

        if (productStock.amount < 1) {
          toast.error('Quantidade solicitada fora de estoque');
  
          return;
        }

        newCart = [
          ...newCart,
          {
            ...newProduct,
            amount: 1,
          }
        ]
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))

      setCart(newCart);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productOnCart = cart.find((product) => product.id === productId);

      if (!productOnCart) {
        toast.error('Erro na remoção do produto');

        return;
      }

      const newCarts = cart.filter((product) => product.id !== productId);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCarts))

      setCart(newCarts);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      let newCart = cart;

      if (amount < 1) {
        return;
      } else {
        const { data: productStock } = await api.get<Stock>(`/stock/${productId}`);

        if (amount > productStock.amount) {
          toast.error('Quantidade solicitada fora de estoque');

          return;
        }

        newCart = newCart.map((product) => {
          if (product.id === productId) {
            return {
              ...product,
              amount,
            }
          }

          return product;
        });
      }
  
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))

      setCart(newCart);
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
