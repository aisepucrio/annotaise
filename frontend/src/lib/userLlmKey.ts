import type { AIProvider } from '@/modules/labelings/labelingsTypes';

/*
 * Modo "usar a chave de IA só nesta sessão": ela fica no localStorage deste
 * navegador e viaja no header X-User-LLM-Key nas requisições que podem
 * disparar o desempate por LLM — o backend usa e descarta, sem gravar nada.
 * É o caminho alternativo ao de salvar a chave criptografada no servidor.
 * O armazenamento é por rotulação, espelhando o vínculo de AICredential.
 */

const PREFIX = 'annotaise.llm-key.';

export const USER_LLM_KEY_HEADER = 'X-User-LLM-Key';
export const USER_LLM_PROVIDER_HEADER = 'X-User-LLM-Provider';

export type UserLlmKey = {
  provider: AIProvider;
  apiKey: string;
};

const storageKeyFor = (labelingId: number) => `${PREFIX}${labelingId}`;


export function isHeaderSafeKey(value: string): boolean {
  return /^[\x20-\x7e]+$/.test(value);
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isUserLlmKeyStorageAvailable(): boolean {
  return getStorage() !== null;
}

export function getUserLlmKey(labelingId: number): UserLlmKey | null {
  const storage = getStorage();
  if (!storage || !Number.isFinite(labelingId)) return null;

  try {
    const raw = storage.getItem(storageKeyFor(labelingId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<UserLlmKey> | null;
    if (!parsed?.apiKey || !parsed?.provider) return null;

    return { provider: parsed.provider, apiKey: parsed.apiKey };
  } catch {
    return null;
  }
}

export function setUserLlmKey(labelingId: number, value: UserLlmKey): boolean {
  const storage = getStorage();
  if (!storage || !Number.isFinite(labelingId)) return false;

  try {
    storage.setItem(storageKeyFor(labelingId), JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function clearUserLlmKey(labelingId: number): void {
  const storage = getStorage();
  if (!storage || !Number.isFinite(labelingId)) return;

  try {
    storage.removeItem(storageKeyFor(labelingId));
  } catch {
  }
}

/**
 * Apaga as chaves de todas as rotulações. Chamada no logout: nenhuma chave
 * pode sobreviver à troca de usuário no mesmo navegador.
 */
export function clearAllUserLlmKeys(): void {
  const storage = getStorage();
  if (!storage) return;

  try {
   
    const keys = Object.keys(storage).filter((key) => key.startsWith(PREFIX));
    keys.forEach((key) => storage.removeItem(key));
  } catch {
  }
}

export function userLlmKeyHeaders(labelingId: number): Record<string, string> {
  const stored = getUserLlmKey(labelingId);
  if (!stored) return {};

  return {
    [USER_LLM_KEY_HEADER]: stored.apiKey,
    [USER_LLM_PROVIDER_HEADER]: stored.provider,
  };
}
