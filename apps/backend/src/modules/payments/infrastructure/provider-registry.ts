import { IPaymentProvider } from '../domain/interfaces/payment-provider';

type ProviderName = 'momo' | 'stripe';

/**
 * Registry that resolves a named payment provider.
 * Extension point: register additional providers (VNPay, ZaloPay) by adding
 * their IPaymentProvider implementation to the providers map at construction.
 */
export class PaymentProviderRegistry {
  private readonly providers: Map<ProviderName, IPaymentProvider>;

  constructor(providers: IPaymentProvider[]) {
    this.providers = new Map(providers.map((p) => [p.name, p]));
  }

  resolve(name: ProviderName): IPaymentProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Payment provider '${name}' is not registered`);
    }
    return provider;
  }
}
