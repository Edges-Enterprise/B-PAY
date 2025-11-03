// src/hooks/useWelcomeOfferProduct.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/config/supabase";

export interface WelcomeOfferProduct {
  plan_id: number;
  data: string;
  price: number;
  validity: string;
  category: string;
  description?: string;
  variation_code: string;
  planType: string;
  network_id: number;
  provider_name: string;
}

export const useWelcomeOfferProduct = () => {
  return useQuery<WelcomeOfferProduct>({
    queryKey: ["welcomeOfferProduct"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("welcome_offer_product")
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
};