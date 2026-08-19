import { computed, reactive, ref, watch } from 'vue';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from '@/services/firebase';

interface AuthState {
  isAuthenticated: boolean;
  uid: string;
  displayName: string;
  email: string;
}

const storageKey = 'loop-debts-auth-v1';
const defaultState: AuthState = {
  isAuthenticated: false,
  uid: '',
  displayName: '',
  email: '',
};

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return { ...defaultState };

  try {
    return { ...defaultState, ...JSON.parse(saved) } as AuthState;
  } catch {
    return { ...defaultState };
  }
}

const state = reactive<AuthState>(loadState());
const isReady = ref(false);
let authObserverStarted = false;

watch(
  state,
  (nextState) => localStorage.setItem(storageKey, JSON.stringify(nextState)),
  { deep: true },
);

function applyUser(user: { uid: string; displayName: string | null; email: string | null }) {
  state.uid = user.uid;
  state.displayName = user.displayName || user.email?.split('@')[0] || 'Loop user';
  state.email = user.email || '';
  state.isAuthenticated = true;
}

export function useAuthStore() {
  const initials = computed(() => {
    const source = state.displayName.trim() || state.email.split('@')[0] || 'LD';
    return source
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  });

  async function signIn(input: { email: string; password: string }) {
    const email = input.email.trim().toLowerCase();

    try {
      const credential = await signInWithEmailAndPassword(auth, email, input.password);
      applyUser(credential.user);
      isReady.value = true;
    } catch (signInError) {
      try {
        const credential = await createUserWithEmailAndPassword(auth, email, input.password);
        applyUser(credential.user);
        isReady.value = true;
      } catch (createError) {
        throw createError instanceof Error ? createError : signInError;
      }
    }
  }

  async function signOut() {
    await firebaseSignOut(auth);
    Object.assign(state, defaultState);
    localStorage.removeItem(storageKey);
    isReady.value = true;
  }

  async function signInWithGoogle() {
    const credential = await signInWithPopup(auth, new GoogleAuthProvider());
    applyUser(credential.user);
    isReady.value = true;
  }

  if (!authObserverStarted) {
    authObserverStarted = true;
    onAuthStateChanged(auth, (user) => {
      if (user) applyUser(user);
      else Object.assign(state, defaultState);
      isReady.value = true;
    });
  }

  return { state, initials, isReady, signIn, signInWithGoogle, signOut };
}
