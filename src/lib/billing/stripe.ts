import "server-only";

import Stripe from "stripe";
import { getStripeSecretKey } from "@/lib/env";

export const STRIPE_API_VERSION = "2026-05-27.dahlia";

export function getStripeClient() {
  return new Stripe(getStripeSecretKey(), {
    apiVersion: STRIPE_API_VERSION,
  });
}
